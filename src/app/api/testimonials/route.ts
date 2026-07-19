import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireOrderAccess } from "@/lib/api/authz";

export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  const { orderId, reviewText, consentShowVideo, consentShowPrompt, consentHideName, consentHideBrand } = body;

  if (!orderId || !reviewText?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { order, user } = await requireOrderAccess(orderId);
  if (order.status !== "DELIVERED") return NextResponse.json({ error: "Order not delivered" }, { status: 400 });

  const testimonial = await prisma.testimonial.create({
    data: {
      orderId,
      userId: user.id,
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
  } catch (error) { return apiError(error); }
}
