import { NextRequest, NextResponse } from "next/server";
import { grantPaidCredits, reversePaymentCredits } from "@/lib/billing/wallet";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sha256, timingSafeEqual } from "@/lib/security/crypto";

type XenditPayload = {
  payment_request_id?: unknown;
  id?: unknown;
  status?: unknown;
  updated?: unknown;
  reference_id?: unknown;
  request_amount?: unknown;
  amount?: unknown;
  paid_amount?: unknown;
  currency?: unknown;
  payment_token_id?: string;
  network_transaction_id?: string;
};
type XenditWebhook = XenditPayload & { event_id?: unknown; event?: unknown; data?: XenditPayload };

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: XenditWebhook;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const payload = body.data || body;
  const expected = process.env.XENDIT_WEBHOOK_SECRET || "";
  const valid = !!expected && timingSafeEqual(request.headers.get("x-callback-token") || "", expected);
  const providerEventId = String(body.event_id || body.id || `${payload.payment_request_id || payload.id}:${payload.status || "UNKNOWN"}:${payload.updated || sha256(raw)}`);
  const event = await prisma.paymentEvent.upsert({
    where: { provider_providerEventId: { provider: "xendit", providerEventId } },
    create: { provider: "xendit", providerEventId, eventType: String(body.event || payload.status || "UNKNOWN"), headersHash: sha256(JSON.stringify(Object.fromEntries(request.headers))), signatureValid: valid, payload: body as unknown as Prisma.InputJsonValue, status: valid ? "VERIFIED" : "REJECTED", failureReason: valid ? null : "Invalid callback token" },
    update: {},
  });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payment = await prisma.payment.findUnique({ where: { referenceId: String(payload.reference_id || "") } });
  if (!payment || (event.paymentId && event.status === "PROCESSED")) return NextResponse.json({ received: true });
  const amount = Number(payload.request_amount ?? payload.amount ?? payload.paid_amount);
  const currency = String(payload.currency || "IDR").toUpperCase();
  if (amount !== payment.idrAmount || currency !== "IDR") {
    await prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "REJECTED", failureReason: "Amount or currency mismatch", processedAt: new Date() } });
    return NextResponse.json({ received: true });
  }
  const status = String(payload.status || "").toUpperCase();
  if (["SUCCEEDED", "PAID", "COMPLETED", "CAPTURED"].includes(status)) await grantPaidCredits(payment.id, providerEventId, payload.payment_token_id, payload.network_transaction_id);
  else if (["REFUNDED", "CHARGEBACK", "DISPUTED"].includes(status) && payment.status === "PAID") await reversePaymentCredits(payment.id, providerEventId, status === "REFUNDED" ? "REFUND" : "CHARGEBACK");
  else if (payment.status !== "PAID") await prisma.payment.update({ where: { id: payment.id }, data: { status: ["FAILED", "EXPIRED", "CANCELLED"].includes(status) ? status : "PENDING_ACTION" } });
  await prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "PROCESSED", processedAt: new Date() } });
  return NextResponse.json({ received: true });
}
