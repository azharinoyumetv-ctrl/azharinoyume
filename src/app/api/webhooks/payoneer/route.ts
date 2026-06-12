import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markInvoicePaid } from "@/lib/invoice/generate";
import crypto from "crypto";

function verifyPayoneerSignature(body: string, sig: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-payoneer-signature") || "";
  const secret = process.env.PAYONEER_WEBHOOK_SECRET || "";

  if (secret && !verifyPayoneerSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type?: string; data?: { payment_id?: string; status?: string; amount?: number; currency?: string; reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Store raw event for audit
  await prisma.paymentGatewayEvent.create({
    data: { provider: "payoneer", eventType: event.event_type || "unknown", rawPayload: event, processed: false },
  });

  if (event.event_type !== "PAYMENT_COMPLETED") {
    return NextResponse.json({ received: true });
  }

  const { payment_id, amount, currency, reference } = event.data || {};
  if (!reference || !amount || !currency) return NextResponse.json({ received: true });

  // Find invoice by payment reference
  const invoice = await prisma.invoice.findFirst({
    where: { paymentReference: reference, status: { not: "paid" } },
    include: { order: true },
  });

  if (!invoice) return NextResponse.json({ received: true });

  // Check for duplicate
  const duplicate = await prisma.paymentTransaction.findFirst({ where: { gatewayTransactionId: payment_id } });
  if (duplicate) return NextResponse.json({ received: true });

  // Amount check (allow small fee variance ≤5%)
  const expectedAmount = Number(invoice.total);
  const receivedAmount = Number(amount);
  if (Math.abs(receivedAmount - expectedAmount) / expectedAmount > 0.05) {
    console.warn(`[payoneer] Amount mismatch: expected ${expectedAmount}, got ${receivedAmount}`);
    return NextResponse.json({ received: true });
  }

  const tx = await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      provider: "payoneer",
      gatewayTransactionId: payment_id || crypto.randomUUID(),
      amount: receivedAmount,
      currency: currency.toUpperCase(),
      status: "confirmed",
    },
  });

  await markInvoicePaid(invoice.id, receivedAmount, tx.id, "payoneer");
  await prisma.order.update({ where: { id: invoice.orderId }, data: { status: "processing" } });

  // Trigger n8n
  const n8nUrl = process.env.N8N_PAYMENT_CONFIRMED_WEBHOOK;
  if (n8nUrl) {
    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: invoice.orderId }),
    }).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
