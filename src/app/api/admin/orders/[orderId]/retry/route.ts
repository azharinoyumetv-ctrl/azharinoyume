import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.order.update({ where: { id: params.orderId }, data: { status: "processing" } });
  await prisma.adminAction.create({
    data: { adminId: session.user.id, action: "retry_render", targetType: "order", targetId: params.orderId },
  });

  if (process.env.N8N_BASE_URL) {
    await fetch(`${process.env.N8N_BASE_URL}/webhook/order-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET || "" },
      body: JSON.stringify({ event: "retry_render", orderId: params.orderId }),
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
