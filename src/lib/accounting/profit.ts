import { prisma } from "@/lib/prisma";

function gatewayFeeRate(provider: string, channel: string) {
  const configured = Number(
    process.env[`PAYMENT_FEE_RESERVE_${provider.toUpperCase()}_PCT`],
  );
  if (Number.isFinite(configured) && configured >= 0) return configured / 100;
  if (provider === "xendit") return channel === "QRIS" ? 0.0181 : 0.05;
  if (provider === "midtrans") return 0.04;
  if (provider === "doku") return 0.04;
  if (provider === "payoneer") return 0.045;
  return 0.05;
}

function metadataChannel(metadata: unknown) {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    "channel" in metadata
  ) {
    return String((metadata as { channel: unknown }).channel || "");
  }
  return "";
}

export async function recalculateOrderProfit(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      quoteId: true,
      totalPrice: true,
      manualReviewRequired: true,
    },
  });
  if (!order) throw new Error("Order not found for profit calculation");

  const [costs, payment] = await Promise.all([
    prisma.costLog.findMany({
      where: { orderId },
      select: { costType: true, amount: true },
    }),
    order.quoteId
      ? prisma.payment.findFirst({
          where: { quoteId: order.quoteId, status: "PAID" },
          orderBy: { paidAt: "desc" },
          select: { provider: true, metadata: true },
        })
      : null,
  ]);

  const grossRevenue = Number(order.totalPrice);
  const byType = new Map<string, number>();
  for (const cost of costs) {
    byType.set(
      cost.costType,
      (byType.get(cost.costType) || 0) + Number(cost.amount),
    );
  }
  const aiCost = byType.get("ai") || 0;
  const renderCost = byType.get("render") || 0;
  const storageCost = byType.get("storage") || 0;
  const revisionCost = byType.get("revision") || 0;
  const otherCost = [...byType.entries()]
    .filter(
      ([type]) => !["ai", "render", "storage", "revision"].includes(type),
    )
    .reduce((sum, [, amount]) => sum + amount, 0);
  const gatewayFee = payment
    ? grossRevenue *
      gatewayFeeRate(payment.provider, metadataChannel(payment.metadata))
    : 0;
  const totalDirectCost =
    gatewayFee + aiCost + renderCost + storageCost + revisionCost + otherCost;
  const grossProfit = grossRevenue - totalDirectCost;
  const profitMargin = grossRevenue
    ? (grossProfit / grossRevenue) * 100
    : 0;
  const costCapUsedPct = grossRevenue
    ? (totalDirectCost / grossRevenue) * 100
    : 100;

  const report = await prisma.profitReport.upsert({
    where: { orderId },
    create: {
      orderId,
      grossRevenue,
      gatewayFee,
      netReceived: grossRevenue - gatewayFee,
      aiCost,
      renderCost,
      storageCost,
      revisionCost,
      totalDirectCost,
      grossProfit,
      profitMargin,
      costCapUsedPct,
    },
    update: {
      grossRevenue,
      gatewayFee,
      netReceived: grossRevenue - gatewayFee,
      aiCost,
      renderCost,
      storageCost,
      revisionCost,
      totalDirectCost,
      grossProfit,
      profitMargin,
      costCapUsedPct,
      calculatedAt: new Date(),
    },
  });

  if (costCapUsedPct >= 20 && !order.manualReviewRequired) {
    await prisma.order.update({
      where: { id: orderId },
      data: { manualReviewRequired: true },
    });
  }
  return report;
}
