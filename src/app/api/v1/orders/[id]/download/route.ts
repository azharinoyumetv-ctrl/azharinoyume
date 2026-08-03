import { NextRequest, NextResponse } from "next/server";
import { apiError, ApiError, requireOrderAccess } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, order } = await requireOrderAccess(id);
    const requestedRenderId = _request.nextUrl.searchParams.get("renderId");
    const expectedType = order.status === "DELIVERED" ? "final" : order.status === "DRAFT_REVIEW" ? "draft" : null;
    if (!expectedType && user.role !== "admin") throw new ApiError(409, "This output is still in production or QA");
    const render = await prisma.render.findFirst({
      where: {
        orderId: id,
        status: "SUCCEEDED",
        ...(requestedRenderId ? { id: requestedRenderId } : {}),
        ...(user.role === "admin" || !expectedType ? {} : { renderType: expectedType }),
      },
      include: { qualityCheck: true },
      orderBy: { createdAt: "desc" },
    });
    if (!render?.outputR2Key || !render.qualityCheck) throw new ApiError(404, "Verified output is unavailable");
    if (render.qualityCheck.status !== "passed" && !(order.adminApproved && render.qualityCheck.status === "review_required"))
      throw new ApiError(409, "This output has not passed QA");
    const delivery = await prisma.deliveryLink.findFirst({ where: { orderId: id, r2Key: render.outputR2Key, expiresAt: { gt: new Date() } } });
    if (!delivery) throw new ApiError(404, "The secure output link has expired");
    return NextResponse.redirect(await getSignedDownloadUrl(render.outputR2Key, 10 * 60));
  } catch (error) { return apiError(error); }
}
