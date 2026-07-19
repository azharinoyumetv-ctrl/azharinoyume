import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";

const Schema = z.object({
  tier: z.enum(["basic", "plus", "premium"]),
  purpose: z.string().max(200).optional(),
  visualStyle: z.string().max(100).optional(),
  platform: z.string().max(100).optional(),
  aspectRatio: z.string().max(30).optional(),
  resolution: z.string().max(30).optional(),
  frameRate: z.string().max(30).optional(),
  prompt: z.string().max(10_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = Schema.parse(await request.json());
    const key = request.headers.get("idempotency-key");
    if (!key || key.length < 12) throw new ApiError(400, "A valid Idempotency-Key header is required");
    const existing = await prisma.order.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.userId !== user.id) throw new ApiError(409, "Idempotency key is already in use");
      return NextResponse.json(existing);
    }
    const order = await prisma.order.create({
      data: { orderNumber: generateOrderNumber(), userId: user.id, customerEmail: user.email, customerName: user.name, package: input.tier, status: "DRAFT_UPLOAD", purpose: input.purpose, visualStyle: input.visualStyle, platform: input.platform, aspectRatio: input.aspectRatio, resolution: input.resolution || "1080p", frameRate: input.frameRate || "30fps", customerPromptOriginal: input.prompt, totalPrice: 0, currency: "CREDITS", maxRevisions: input.tier === "premium" ? 3 : input.tier === "plus" ? 2 : 1, idempotencyKey: key },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid order", issues: error.issues }, { status: 400 });
    return apiError(error);
  }
}
