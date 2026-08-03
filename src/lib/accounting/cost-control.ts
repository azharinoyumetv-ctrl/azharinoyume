import { prisma } from "@/lib/prisma";
import { estimatedGatewayFee } from "@/lib/accounting/profit";
import { getCostCap } from "@/lib/utils";
import { ApiError } from "@/lib/api/authz";

export class CostCapExceededError extends ApiError {
  constructor(
    public readonly orderId: string,
    public readonly operation: string,
    public readonly projectedCost: number,
    public readonly costCap: number,
  ) {
    super(
      409,
      `Cost cap blocked ${operation}: projected direct cost $${projectedCost.toFixed(2)} exceeds the $${costCap.toFixed(2)} tier cap`,
    );
    this.name = "CostCapExceededError";
  }
}

export function projectDirectCost(input: {
  incurredCost: number;
  gatewayFee: number;
  upcomingCostUsd: number;
}) {
  return input.incurredCost + input.gatewayFee + input.upcomingCostUsd;
}

export async function getOrderCostPosition(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      package: true,
      totalPrice: true,
      quoteId: true,
      costLogs: { select: { amount: true } },
    },
  });
  if (!order) throw new Error("Order not found for cost control");

  const payment = order.quoteId
    ? await prisma.payment.findFirst({
        where: { quoteId: order.quoteId, status: "PAID" },
        orderBy: { paidAt: "desc" },
        select: { provider: true, metadata: true },
      })
    : null;
  const grossRevenue = Number(order.totalPrice);
  const incurredCost = order.costLogs.reduce(
    (sum, cost) => sum + Number(cost.amount),
    0,
  );
  const gatewayFee = payment
    ? estimatedGatewayFee(grossRevenue, payment.provider, payment.metadata)
    : 0;

  return {
    tier: order.package,
    costCap: getCostCap(order.package),
    incurredCost,
    gatewayFee,
    totalCommittedCost: incurredCost + gatewayFee,
  };
}

export async function requireCostHeadroom(input: {
  orderId: string;
  upcomingCostUsd: number;
  operation: string;
}) {
  if (!Number.isFinite(input.upcomingCostUsd) || input.upcomingCostUsd < 0)
    throw new Error(`Invalid projected cost for ${input.operation}`);
  const position = await getOrderCostPosition(input.orderId);
  const projectedCost = projectDirectCost({
    incurredCost: position.incurredCost,
    gatewayFee: position.gatewayFee,
    upcomingCostUsd: input.upcomingCostUsd,
  });
  if (projectedCost <= position.costCap + 0.0001) return position;

  await prisma.order.update({
    where: { id: input.orderId },
    data: { manualReviewRequired: true, status: "PRODUCTION_REVIEW_REQUIRED" },
  });
  const existing = await prisma.reviewTask.findFirst({
    where: {
      orderId: input.orderId,
      status: "OPEN",
      reason: { startsWith: "Cost cap blocked" },
    },
  });
  if (!existing) {
    await prisma.reviewTask.create({
      data: {
        orderId: input.orderId,
        reason: `Cost cap blocked ${input.operation}. Projected direct cost is $${projectedCost.toFixed(2)} against a $${position.costCap.toFixed(2)} cap. Re-scope, re-price, or configure a lower-cost production route before continuing.`,
        riskScore: 95,
      },
    });
  }
  throw new CostCapExceededError(
    input.orderId,
    input.operation,
    projectedCost,
    position.costCap,
  );
}
