import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, reviewText, consentShowVideo, consentShowPrompt, consentHideName, consentHideBrand } = body;

  if (!orderId || !reviewText?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "delivered") return NextResponse.json({ error: "Order not delivered" }, { status: 400 });

  const testimonial = await prisma.testimonial.create({
    data: {
      orderId,
      userId: order.userId,
      reviewText: reviewText.trim(),
      consentShowVideo: consentShowVideo ?? false,
      consentShowPrompt: consentShowPrompt ?? false,
      consentHideName: consentHideName ?? false,
      consentHideBrand: consentHideBrand ?? false,
      status: "pending",
      published: false,
    },
  });

  return NextResponse.json({ ok: true, id: testimonial.id });
}
