import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEditBrief } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const brief = await generateEditBrief({
    orderId,
    package: order.package,
    purpose: order.purpose || "",
    visualStyle: order.visualStyle || "",
    mood: order.mood || "",
    editingPace: order.editingPace || "",
    colorGrade: order.colorGrade || "",
    captionStyle: order.captionStyle || "",
    musicStyle: order.musicStyle || "",
    platform: order.platform || "",
    aspectRatio: order.aspectRatio || "",
    resolution: order.resolution,
    frameRate: order.frameRate,
    customerPromptEn: order.customerPromptEn || order.customerPromptOriginal || "",
  });

  await prisma.editBrief.create({
    data: {
      orderId,
      promptOriginal: order.customerPromptOriginal,
      promptLanguage: order.customerPromptLanguage,
      promptEn: order.customerPromptEn,
      structuredBrief: { text: brief },
    },
  });

  await prisma.order.update({ where: { id: orderId }, data: { status: "editing_started" } });

  return NextResponse.json({ ok: true, brief });
}
