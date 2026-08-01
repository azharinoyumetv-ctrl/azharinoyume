import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiError, requireOrderAccess } from "@/lib/api/authz";
import { createCheckoutQuote } from "@/lib/billing/quotes";
import { prisma } from "@/lib/prisma";
import { PROJECT_TIERS, type ProjectTier } from "@/lib/production/catalog";
import { requireProductionReadiness } from "@/lib/production/readiness";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user, order } = await requireOrderAccess(id);
    if (!order.userId || order.userId !== user.id)
      throw new ApiError(403, "Customer project access is required");
    if (!(order.package in PROJECT_TIERS))
      throw new ApiError(409, "This order does not use project pricing");
    if (order.status !== "AWAITING_PAYMENT")
      throw new ApiError(409, "This order is not awaiting payment");
    requireProductionReadiness(order.editingMode === "360" ? "360" : "standard");

    const asset = await prisma.uploadedAsset.findFirst({
      where: { orderId: order.id, userId: user.id, status: "VERIFIED" },
      orderBy: { createdAt: "desc" },
    });
    if (!asset?.durationMs)
      throw new ApiError(409, "Verified footage is required before checkout");

    const tier = PROJECT_TIERS[order.package as ProjectTier];
    if (asset.durationMs > tier.sourceMinutes * 60_000)
      throw new ApiError(
        409,
        `${tier.name} includes up to ${tier.sourceMinutes} source minutes`,
      );

    if (order.quoteId) {
      const current = await prisma.checkoutQuote.findUnique({
        where: { id: order.quoteId },
      });
      if (
        current &&
        current.status.startsWith("OPEN") &&
        current.expiresAt > new Date()
      )
        return NextResponse.json(current);
      if (current?.status === "PROCESSING")
        throw new ApiError(409, "A payment attempt is already in progress");
    }

    const key = request.headers.get("idempotency-key");
    if (!key || key.length < 12)
      throw new ApiError(400, "A valid Idempotency-Key header is required");
    const quote = await createCheckoutQuote(user.id, tier.productKey, key);
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { quoteId: quote.id },
      }),
      prisma.invoice.updateMany({
        where: { orderId: order.id, status: "pending_payment" },
        data: { expiresAt: quote.expiresAt },
      }),
    ]);
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
