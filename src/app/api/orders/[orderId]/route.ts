import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireOrderAccess } from "@/lib/api/authz";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
  const { orderId } = await params;
  await requireOrderAccess(orderId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      deliveryLinks: { orderBy: { createdAt: "desc" } },
      renders: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "desc" } },
      revisions: { orderBy: { revisionNumber: "asc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
  } catch (error) {
    return apiError(error);
  }
}
