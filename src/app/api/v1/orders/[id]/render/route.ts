import { NextRequest, NextResponse } from "next/server";
import { apiError, ApiError, requireOrderAccess } from "@/lib/api/authz";
import { calculateRenderCredits } from "@/lib/billing/quotes";
import { reserveCredits } from "@/lib/billing/wallet";
import { prisma } from "@/lib/prisma";
import { getRenderQueue } from "@/lib/queue/queues";
import { R2Keys } from "@/lib/storage/r2";
import { requireProductionReadiness } from "@/lib/production/readiness";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, order } = await requireOrderAccess(id);
    requireProductionReadiness(order.editingMode === "360" ? "360" : "standard");
    if (user.role === "admin" && !order.userId) throw new ApiError(400, "Draft lead orders cannot render without a customer wallet");
    const key = request.headers.get("idempotency-key");
    if (!key || key.length < 12) throw new ApiError(400, "A valid Idempotency-Key header is required");
    const existing = await prisma.render.findUnique({ where: { idempotencyKey: key } });
    if (existing) return NextResponse.json(existing);
    const asset = await prisma.uploadedAsset.findFirst({ where: { orderId: id, userId: order.userId, status: "VERIFIED" }, orderBy: { createdAt: "desc" } });
    if (!asset?.durationMs) throw new ApiError(400, "A verified video upload is required");
    const tier = order.package as "basic" | "plus" | "premium";
    if (!["basic", "plus", "premium"].includes(tier)) throw new ApiError(400, "Unknown render tier");
    const credits = calculateRenderCredits(asset.durationMs, tier);
    const render = await prisma.render.create({ data: { orderId: id, renderType: "draft", status: "QUEUED", idempotencyKey: key, reservedCredits: credits, outputR2Key: R2Keys.draft(id, order.revisionCount + 1) } });
    try {
      const reservation = await reserveCredits(order.userId!, id, credits, `render:${key}`);
      await prisma.order.update({ where: { id }, data: { status: "QUEUED", estimatedCredits: credits } });
      await getRenderQueue().add("render-video", { orderId: id, renderId: render.id, reservationId: reservation.id }, { jobId: render.id });
      return NextResponse.json({ renderId: render.id, status: "QUEUED", reservedCredits: credits }, { status: 202 });
    } catch (error) {
      await prisma.render.update({ where: { id: render.id }, data: { status: "FAILED", errorLog: error instanceof Error ? error.message : "Credit reservation failed" } });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
