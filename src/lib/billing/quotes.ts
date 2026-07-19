import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/authz";

const QUOTE_TTL_MS = 15 * 60 * 1000;
const FX_WARN_MS = 24 * 60 * 60 * 1000;
const FX_DISABLE_MS = 48 * 60 * 60 * 1000;

export async function createCheckoutQuote(userId: string, productKey: string, idempotencyKey: string) {
  const existing = await prisma.checkoutQuote.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.userId !== userId) throw new ApiError(409, "Idempotency key is already in use");
    return existing;
  }
  const [product, fx] = await Promise.all([
    prisma.pricingProduct.findUnique({ where: { key: productKey } }),
    prisma.fxRate.findUnique({ where: { id: "USD_IDR" } }),
  ]);
  if (!product?.active) throw new ApiError(404, "Pricing product is unavailable");
  if (!fx) throw new ApiError(503, "USD/IDR checkout rate is not configured");
  const rateAge = Date.now() - fx.effectiveAt.getTime();
  if (rateAge > FX_DISABLE_MS) throw new ApiError(503, "Checkout is paused until the USD/IDR rate is refreshed");
  const idrAmount = Math.ceil((((product.usdCents / 100) * Number(fx.rate)) / 100)) * 100;
  return prisma.checkoutQuote.create({
    data: { userId, productId: product.id, usdCents: product.usdCents, idrAmount, fxRate: fx.rate, fxRateVersion: fx.version, credits: product.credits, idempotencyKey, expiresAt: new Date(Date.now() + QUOTE_TTL_MS), status: rateAge > FX_WARN_MS ? "OPEN_FX_WARNING" : "OPEN" },
  });
}

export const RENDER_CREDIT_RATES = { basic: 2, plus: 6, premium: 13 } as const;

export function calculateRenderCredits(durationMs: number, tier: keyof typeof RENDER_CREDIT_RATES) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new ApiError(400, "Verified media duration is required");
  return Math.ceil(durationMs / 1000) * RENDER_CREDIT_RATES[tier];
}
