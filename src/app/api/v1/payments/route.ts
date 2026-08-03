import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { createDokuCheckout } from "@/lib/payment/doku";
import { createMidtransPayment } from "@/lib/payment/midtrans";
import { createPayoneerPayment } from "@/lib/payment/payoneer";
import { requirePaymentProvider } from "@/lib/payment/providers";
import { requireBriefCapabilityReadiness } from "@/lib/production/readiness";
import { createXenditPackPayment } from "@/lib/payment/xendit";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ quoteId: z.string().uuid(), gateway: z.enum(["doku", "xendit", "midtrans", "payoneer"]), channel: z.string().optional() });

function storedAction(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("action" in metadata)) return { type: "NONE" };
  return (metadata as { action: unknown }).action;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = Schema.parse(await request.json());
    const key = request.headers.get("idempotency-key");
    if (!key || key.length < 12) throw new ApiError(400, "A valid Idempotency-Key header is required");
    const prior = await prisma.payment.findUnique({ where: { idempotencyKey: key } });
    if (prior) {
      if (prior.userId !== user.id) throw new ApiError(409, "Idempotency key is already in use");
      return NextResponse.json({ paymentId: prior.id, status: prior.status, action: storedAction(prior.metadata) });
    }
    const quote = await prisma.checkoutQuote.findFirst({
      where: { id: input.quoteId, userId: user.id },
      include: { product: true, order: { select: { editingMode: true, package: true, musicStyle: true } } },
    });
    if (!quote) throw new ApiError(404, "Quote not found");
    if (!quote.status.startsWith("OPEN") || quote.expiresAt <= new Date()) throw new ApiError(409, "Quote has expired or was already used");
    if (quote.product.kind !== "PROJECT") throw new ApiError(410, "Credit packs and subscriptions are retired");
    if (!quote.order) throw new ApiError(409, "Project quote is not connected to an order");
    requireBriefCapabilityReadiness({
      mode: quote.order.editingMode === "360" ? "360" : "standard",
      tier: quote.order.package as "basic" | "plus" | "premium",
      musicStyle: quote.order.musicStyle || "none",
    });
    const provider = await requirePaymentProvider(input.gateway, quote.product.kind);
    const referenceId = `AZY-${crypto.randomUUID()}`;
    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { userId: user.id, quoteId: quote.id, provider: input.gateway, referenceId, idempotencyKey: key, usdCents: quote.usdCents, idrAmount: quote.idrAmount, currency: input.gateway === "payoneer" ? "USD" : "IDR", expiresAt: new Date(Date.now() + 48 * 3600_000), metadata: { channel: input.channel || "QRIS" } } });
      await tx.checkoutQuote.update({ where: { id: quote.id }, data: { status: "PROCESSING" } });
      return payment;
    });
    try {
      const result = input.gateway === "doku"
        ? await createDokuCheckout({ referenceId, amount: quote.idrAmount, customer: { name: user.name, email: user.email } })
        : input.gateway === "midtrans"
          ? await createMidtransPayment({ referenceId, amount: quote.idrAmount, customer: { name: user.name, email: user.email } })
        : input.gateway === "payoneer"
          ? await createPayoneerPayment({ referenceId, usdCents: quote.usdCents, customerEmail: user.email }, provider.checkoutUrl)
          : await createXenditPackPayment({ referenceId, amount: quote.idrAmount, channel: input.channel || "QRIS", idempotencyKey: key });
      const payment = await prisma.payment.update({ where: { id: created.id }, data: { providerPaymentId: result.providerPaymentId, status: "PENDING_ACTION", metadata: { channel: input.channel || "QRIS", action: result.action } } });
      return NextResponse.json({ paymentId: payment.id, status: payment.status, action: result.action }, { status: 201 });
    } catch (providerError) {
      await prisma.$transaction([prisma.payment.update({ where: { id: created.id }, data: { status: "FAILED", metadata: { error: providerError instanceof Error ? providerError.message : "Gateway request failed" } } }), prisma.checkoutQuote.update({ where: { id: quote.id }, data: { status: "OPEN" } })]);
      throw new ApiError(502, providerError instanceof Error ? providerError.message : "Payment gateway request failed");
    }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid payment request", issues: error.issues }, { status: 400 });
    return apiError(error);
  }
}
