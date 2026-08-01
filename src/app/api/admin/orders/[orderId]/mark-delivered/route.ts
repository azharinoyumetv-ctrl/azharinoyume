import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { renders: { where: { status: "SUCCEEDED" }, take: 1 } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.renders.length) return NextResponse.json({ error: "No successful render is available" }, { status: 409 });
  await prisma.$transaction([
    prisma.order.update({ where: { id: params.orderId }, data: { status: "DELIVERED" } }),
    prisma.invoice.updateMany({ where: { orderId: params.orderId }, data: { deliveryStatus: "delivered" } }),
    prisma.adminAction.create({
      data: { adminId: session.user.id, action: "mark_delivered", targetType: "order", targetId: params.orderId },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
