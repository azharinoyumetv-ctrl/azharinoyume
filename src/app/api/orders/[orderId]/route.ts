import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      deliveryLinks: { orderBy: { createdAt: "desc" }, take: 1 },
      renders: { orderBy: { id: "desc" }, take: 1 },
      revisions: { orderBy: { revisionNumber: "asc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
