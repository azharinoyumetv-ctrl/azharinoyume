import { NextRequest, NextResponse } from "next/server";
import { grantPaidCredits, reversePaymentCredits } from "@/lib/billing/wallet";
import { Prisma } from "@/generated/prisma/client";
import { parseXenditWebhook } from "@/lib/payment/xendit";
import { prisma } from "@/lib/prisma";
import { sha256, timingSafeEqual } from "@/lib/security/crypto";

type XenditWebhook = Parameters<typeof parseXenditWebhook>[0];

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: XenditWebhook;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = parseXenditWebhook(body);
  const expected = process.env.XENDIT_WEBHOOK_SECRET || "";
  const valid = !!expected && timingSafeEqual(request.headers.get("x-callback-token") || "", expected);
  const providerEventId = String(
    parsed.eventId ||
    `${parsed.providerPaymentId || parsed.referenceId || "unmatched"}:${parsed.status || "UNKNOWN"}:${parsed.updated || sha256(raw)}`,
  );
  const event = await prisma.paymentEvent.upsert({
    where: { provider_providerEventId: { provider: "xendit", providerEventId } },
    create: { provider: "xendit", providerEventId, eventType: parsed.eventType, headersHash: sha256(JSON.stringify(Object.fromEntries(request.headers))), signatureValid: valid, payload: body as unknown as Prisma.InputJsonValue, status: valid ? "VERIFIED" : "REJECTED", failureReason: valid ? null : "Invalid callback token" },
    update: valid
      ? { signatureValid: true, status: "VERIFIED", failureReason: null }
      : {},
  });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!parsed.referenceId && !parsed.providerPaymentId) {
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: { status: "REJECTED", failureReason: "Missing payment identifier", processedAt: new Date() },
    });
    return NextResponse.json({ received: true });
  }
  const matches = await prisma.payment.findMany({
    where: {
      provider: "xendit",
      OR: [
        ...(parsed.referenceId ? [{ referenceId: parsed.referenceId }] : []),
        ...(parsed.providerPaymentId ? [{ providerPaymentId: parsed.providerPaymentId }] : []),
      ],
    },
    take: 2,
  });
  const payment = matches.length === 1 ? matches[0] : null;
  if (matches.length > 1) {
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: { status: "REJECTED", failureReason: "Conflicting payment identifiers", processedAt: new Date() },
    });
    return NextResponse.json({ received: true });
  }
  if (!payment || (event.paymentId && event.status === "PROCESSED")) return NextResponse.json({ received: true });
  if (!Number.isFinite(parsed.amount) || parsed.amount !== payment.idrAmount || parsed.currency !== "IDR") {
    await prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "REJECTED", failureReason: "Amount or currency mismatch", processedAt: new Date() } });
    return NextResponse.json({ received: true });
  }
  const status = parsed.status;
  if (["SUCCEEDED", "PAID", "COMPLETED", "CAPTURED"].includes(status)) await grantPaidCredits(payment.id, providerEventId, parsed.paymentTokenId, parsed.networkTransactionId);
  else if (["REFUNDED", "CHARGEBACK", "DISPUTED"].includes(status) && payment.status === "PAID") await reversePaymentCredits(payment.id, providerEventId, status === "REFUNDED" ? "REFUND" : "CHARGEBACK");
  else if (payment.status !== "PAID") {
    const terminalStatus = status === "CANCELED" || status === "CANCELLED" ? "CANCELLED" : status;
    await prisma.payment.update({ where: { id: payment.id }, data: { status: ["FAILED", "EXPIRED", "CANCELLED"].includes(terminalStatus) ? terminalStatus : "PENDING_ACTION" } });
  }
  await prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "PROCESSED", processedAt: new Date() } });
  return NextResponse.json({ received: true });
}
