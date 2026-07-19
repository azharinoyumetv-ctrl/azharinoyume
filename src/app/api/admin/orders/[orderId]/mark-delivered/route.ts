import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.order.update({ where: { id: params.orderId }, data: { status: "delivered" } });
  await prisma.invoice.updateMany({ where: { orderId: params.orderId }, data: { deliveryStatus: "delivered" } });
  await prisma.adminAction.create({
    data: { adminId: session.user.id, action: "mark_delivered", targetType: "order", targetId: params.orderId },
  });
  return NextResponse.json({ ok: true });
}
