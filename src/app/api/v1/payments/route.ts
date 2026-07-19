import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { createDokuCheckout } from "@/lib/payment/doku";
import { createPayoneerPayment } from "@/lib/payment/payoneer";
import { requirePaymentProvider } from "@/lib/payment/providers";
import { createXenditPackPayment, createXenditRecurringPayment } from "@/lib/payment/xendit";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ quoteId: z.string().uuid(), gateway: z.enum(["doku", "xendit", "payoneer"]), channel: z.string().optional(), paymentTokenId: z.string().min(10).optional() });

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
    const quote = await prisma.checkoutQuote.findFirst({ where: { id: input.quoteId, userId: user.id }, include: { product: true } });
    if (!quote) throw new ApiError(404, "Quote not found");
    if (!quote.status.startsWith("OPEN") || quote.expiresAt <= new Date()) throw new ApiError(409, "Quote has expired or was already used");
    const isSubscription = quote.product.kind === "SUBSCRIPTION";
    const provider = await requirePaymentProvider(input.gateway, quote.product.kind);
    if (isSubscription && input.gateway !== "xendit") throw new ApiError(400, "Automatic subscriptions require Xendit");
    if (isSubscription && !input.paymentTokenId) throw new ApiError(400, "A Xendit payment token is required; raw card data is never accepted");
    const referenceId = `AZY-${crypto.randomUUID()}`;
    const created = await prisma.$transaction(async (tx) => {
      const subscription = isSubscription ? await tx.subscription.create({ data: { userId: user.id, productKey: quote.product.key } }) : null;
      const payment = await tx.payment.create({ data: { userId: user.id, quoteId: quote.id, subscriptionId: subscription?.id, provider: input.gateway, referenceId, idempotencyKey: key, usdCents: quote.usdCents, idrAmount: quote.idrAmount, currency: input.gateway === "payoneer" ? "USD" : "IDR", paymentTokenId: input.paymentTokenId, expiresAt: new Date(Date.now() + 48 * 3600_000), metadata: { channel: input.channel || (isSubscription ? "CARDS" : "QRIS") } } });
      await tx.checkoutQuote.update({ where: { id: quote.id }, data: { status: "PROCESSING" } });
      return payment;
    });
    try {
      const result = input.gateway === "doku"
        ? await createDokuCheckout({ referenceId, amount: quote.idrAmount, customer: { name: user.name, email: user.email } })
        : input.gateway === "payoneer"
          ? await createPayoneerPayment({ referenceId, usdCents: quote.usdCents, customerEmail: user.email }, provider.checkoutUrl)
          : isSubscription
            ? await createXenditRecurringPayment({ referenceId, amount: quote.idrAmount, paymentTokenId: input.paymentTokenId!, idempotencyKey: key, initial: true })
            : await createXenditPackPayment({ referenceId, amount: quote.idrAmount, channel: input.channel || "QRIS", idempotencyKey: key });
      const payment = await prisma.payment.update({ where: { id: created.id }, data: { providerPaymentId: result.providerPaymentId, status: "PENDING_ACTION", metadata: { channel: input.channel || (isSubscription ? "CARDS" : "QRIS"), action: result.action } } });
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
