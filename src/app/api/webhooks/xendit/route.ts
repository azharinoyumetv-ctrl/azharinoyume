import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markInvoicePaid } from "@/lib/invoice/generate";
import { validateWisePayment } from "@/lib/payment/guard";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-callback-token");

  // Validate Xendit webhook token
  if (signature !== process.env.XENDIT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // Store raw event (audit trail — never mutate)
  await prisma.paymentGatewayEvent.create({
    data: {
      provider: "xendit",
      eventType: event.status || "unknown",
      rawPayload: event,
      processed: false,
    },
  });

  if (event.status !== "PAID") {
    return NextResponse.json({ ok: true });
  }

  const orderId = event.external_id;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const invoice = await prisma.invoice.findFirst({
    where: { orderId, status: "pending_payment" },
  });
  if (!invoice) return NextResponse.json({ ok: true }); // already processed

  // Check duplicate
  const existing = await prisma.paymentTransaction.findUnique({
    where: { gatewayTransactionId: event.id },
  });
  if (existing) return NextResponse.json({ ok: true });

  // Validate amount
  if (Math.abs(event.paid_amount - Number(invoice.total)) > 0.01) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "manual_review_required" } });
    return NextResponse.json({ ok: true });
  }

  // Create transaction
  await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      orderId,
      provider: "xendit",
      gatewayTransactionId: event.id,
      amount: event.paid_amount,
      currency: event.currency,
      status: "confirmed",
      rawWebhook: event,
    },
  });

  await markInvoicePaid(invoice.id, event.paid_amount, event.id, "xendit");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "processing" },
  });

  // Trigger n8n to start video processing
  if (process.env.N8N_BASE_URL) {
    await fetch(`${process.env.N8N_BASE_URL}/webhook/payment-confirmed`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET || "" },
      body: JSON.stringify({ orderId, provider: "xendit", amount: event.paid_amount }),
    }).catch(() => {});
  }

  // Update gateway event as processed
  await prisma.paymentGatewayEvent.updateMany({
    where: { provider: "xendit", eventType: event.status, processed: false },
    data: { processed: true },
  });

  return NextResponse.json({ ok: true });
}
