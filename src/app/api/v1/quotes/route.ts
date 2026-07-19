import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireUser } from "@/lib/api/authz";
import { calculateRenderCredits, createCheckoutQuote, RENDER_CREDIT_RATES } from "@/lib/billing/quotes";
import { prisma } from "@/lib/prisma";

const Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CREDITS"), productKey: z.string().min(1) }),
  z.object({ kind: z.literal("RENDER"), assetId: z.string().uuid(), tier: z.enum(["basic", "plus", "premium"]) }),
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = Schema.parse(await request.json());
    if (input.kind === "CREDITS") {
      const key = request.headers.get("idempotency-key");
      if (!key || key.length < 12) return NextResponse.json({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
      return NextResponse.json(await createCheckoutQuote(user.id, input.productKey, key), { status: 201 });
    }
    const asset = await prisma.uploadedAsset.findFirst({ where: { id: input.assetId, userId: user.id, status: "VERIFIED" } });
    if (!asset?.durationMs) return NextResponse.json({ error: "A verified video asset is required" }, { status: 400 });
    const credits = calculateRenderCredits(asset.durationMs, input.tier);
    return NextResponse.json({ assetId: asset.id, tier: input.tier, durationMs: asset.durationMs, rate: RENDER_CREDIT_RATES[input.tier], credits, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid quote request", issues: error.issues }, { status: 400 });
    return apiError(error);
  }
}
