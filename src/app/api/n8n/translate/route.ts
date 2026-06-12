import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { translateToEnglish } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, sourceLang } = await req.json();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.customerPromptOriginal) return NextResponse.json({ ok: true });

  const translated = await translateToEnglish(order.customerPromptOriginal, sourceLang || "en", orderId);
  await prisma.order.update({ where: { id: orderId }, data: { customerPromptEn: translated } });

  return NextResponse.json({ ok: true, translated });
}
