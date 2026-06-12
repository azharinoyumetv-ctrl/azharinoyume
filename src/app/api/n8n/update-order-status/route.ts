import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId, status } = await req.json();
  await prisma.order.update({ where: { id: orderId }, data: { status } });
  return NextResponse.json({ ok: true });
}
