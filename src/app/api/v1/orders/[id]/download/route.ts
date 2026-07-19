import { NextRequest, NextResponse } from "next/server";
import { apiError, ApiError, requireOrderAccess } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireOrderAccess(id);
    const delivery = await prisma.deliveryLink.findFirst({ where: { orderId: id, r2Key: { not: null }, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    if (!delivery?.r2Key) throw new ApiError(404, "Delivery is unavailable or has expired");
    return NextResponse.redirect(await getSignedDownloadUrl(delivery.r2Key, 10 * 60));
  } catch (error) { return apiError(error); }
}
