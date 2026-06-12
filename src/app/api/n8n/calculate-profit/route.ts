import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCostCap } from "@/lib/utils";

const GATEWAY_FEES: Record<string, number> = { xendit: 0.035, payoneer: 0.03, wise: 0.005, stripe: 0.029 };

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoices: { take: 1, orderBy: { createdAt: "desc" } },
      costLogs: true,
      aiUsageLogs: true,
      renderCostLogs: true,
      storageCostLogs: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = order.invoices[0];
  const grossRevenue = Number(invoice?.paidAmount || order.totalPrice);
  const provider = invoice?.paymentMethod || "payoneer";
  const gatewayFeeRate = GATEWAY_FEES[provider] || 0.03;
  const gatewayFee = grossRevenue * gatewayFeeRate;
  const netReceived = grossRevenue - gatewayFee;

  const aiCost = order.aiUsageLogs.reduce((s, l) => s + Number(l.costUsd), 0);
  const renderCost = order.renderCostLogs.reduce((s, l) => s + Number(l.estimatedCostUsd), 0);
  const storageCost = order.storageCostLogs.reduce((s, l) => s + Number(l.estimatedMonthlyCost) / 30, 0);
  const revisionCost = order.costLogs.filter((l) => l.costType === "revision").reduce((s, l) => s + Number(l.amount), 0);

  const totalDirectCost = gatewayFee + aiCost + renderCost + storageCost + revisionCost;
  const grossProfit = grossRevenue - totalDirectCost;
  const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const costCap = getCostCap(order.package);
  const costCapUsedPct = grossRevenue > 0 ? (totalDirectCost / grossRevenue) * 100 : 0;

  const existing = await prisma.profitReport.findUnique({ where: { orderId } });
  const reportData = { grossRevenue, gatewayFee, netReceived, aiCost, renderCost, storageCost, revisionCost, totalDirectCost, grossProfit, profitMargin, costCapUsedPct };

  if (existing) {
    await prisma.profitReport.update({ where: { orderId }, data: reportData });
  } else {
    await prisma.profitReport.create({ data: { orderId, ...reportData } });
  }

  // Alert if over threshold
  const warnThreshold = parseFloat(process.env.COST_WARN_THRESHOLD || "0.15") * 100;
  if (costCapUsedPct >= warnThreshold) {
    console.warn(`[COST ALERT] Order ${orderId}: ${costCapUsedPct.toFixed(1)}% of cost cap used`);
  }

  return NextResponse.json({ ok: true, profitMargin, costCapUsedPct });
}
