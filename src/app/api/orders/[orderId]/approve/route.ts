import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireOrderAccess } from "@/lib/api/authz";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
  const { orderId } = await params;
  const { order } = await requireOrderAccess(orderId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DRAFT_REVIEW") return NextResponse.json({ error: "No draft ready" }, { status: 400 });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED" },
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
