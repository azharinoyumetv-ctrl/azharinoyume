import { NextRequest, NextResponse } from "next/server";
import { grantPaidCredits, reversePaymentCredits } from "@/lib/billing/wallet";
import { Prisma } from "@/generated/prisma/client";
import { verifyDokuWebhook } from "@/lib/payment/doku";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security/crypto";

type DokuWebhook = {
  transaction?: { status?: unknown };
  status?: unknown;
  order?: { invoice_number?: unknown; amount?: unknown; currency?: unknown };
  invoice_number?: unknown;
  amount?: unknown;
  currency?: unknown;
};

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: DokuWebhook;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const providerEventId = request.headers.get("request-id") || sha256(raw);
  const valid = verifyDokuWebhook(raw, request.headers, request.nextUrl.pathname);
  const event = await prisma.paymentEvent.upsert({
    where: { provider_providerEventId: { provider: "doku", providerEventId } },
    create: { provider: "doku", providerEventId, eventType: String(body.transaction?.status || body.status || "UNKNOWN"), headersHash: sha256(JSON.stringify(Object.fromEntries(request.headers))), signatureValid: valid, payload: body as unknown as Prisma.InputJsonValue, status: valid ? "VERIFIED" : "REJECTED", failureReason: valid ? null : "Invalid signature or stale timestamp" },
    update: {},
  });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payment = await prisma.payment.findUnique({ where: { referenceId: String(body.order?.invoice_number || body.invoice_number || "") } });
  if (!payment || (event.paymentId && event.status === "PROCESSED")) return NextResponse.json({ received: true });
  const amount = Number(body.order?.amount ?? body.amount);
  const currency = String(body.order?.currency || body.currency || "IDR").toUpperCase();
  if (amount !== payment.idrAmount || currency !== "IDR") {
    await prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "REJECTED", failureReason: "Amount or currency mismatch", processedAt: new Date() } });
    return NextResponse.json({ received: true });
  }
  const status = String(body.transaction?.status || body.status || "").toUpperCase();
  if (status === "SUCCESS") await grantPaidCredits(payment.id, providerEventId);
  else if (["REFUND", "DISPUTE", "CHARGEBACK"].includes(status) && payment.status === "PAID") await reversePaymentCredits(payment.id, providerEventId, status === "REFUND" ? "REFUND" : "CHARGEBACK");
  else if (payment.status !== "PAID") await prisma.payment.update({ where: { id: payment.id }, data: { status: status === "FAILED" ? "FAILED" : status === "CANCEL" ? "CANCELLED" : status === "EXPIRED" ? "EXPIRED" : "PENDING_ACTION" } });
  await prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "PROCESSED", processedAt: new Date() } });
  return NextResponse.json({ received: true });
}
