import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWisePayment } from "@/lib/payment/guard";
import { markInvoicePaid } from "@/lib/invoice/generate";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-sha256");

  // Validate Wise webhook signature
  const expectedSig = crypto
    .createHmac("sha256", process.env.WISE_WEBHOOK_SECRET || "")
    .update(rawBody)
    .digest("base64");

  if (signature !== expectedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  await prisma.paymentGatewayEvent.create({
    data: {
      provider: "wise",
      eventType: event.event_type || "unknown",
      rawPayload: event,
      processed: false,
    },
  });

  // Only process credit events
  if (!["transfers#state-change", "balances#credit"].includes(event.event_type)) {
    return NextResponse.json({ ok: true });
  }

  const transfer = event.data;
  const reference = transfer?.details?.reference || transfer?.reference || "";
  const gatewayId = String(transfer?.id || "");

  // Find invoice by payment reference
  const invoice = await prisma.invoice.findFirst({
    where: { paymentReference: reference, status: "pending_payment" },
    include: { order: true },
  });

  if (!invoice) {
    // Could be a payment with wrong reference — log and move on
    return NextResponse.json({ ok: true });
  }

  // Check duplicate
  const existing = await prisma.paymentTransaction.findUnique({ where: { gatewayTransactionId: gatewayId } });
  if (existing) return NextResponse.json({ ok: true });

  // Get all existing transaction IDs for duplicate check
  const existingIds = (await prisma.paymentTransaction.findMany({ select: { gatewayTransactionId: true } }))
    .map((t) => t.gatewayTransactionId!)
    .filter(Boolean);

  const validation = validateWisePayment(
    {
      amount: transfer.amount?.value || 0,
      currency: transfer.amount?.currency || "",
      reference,
      status: transfer.status || "",
      gatewayTransactionId: gatewayId,
    },
    {
      total: Number(invoice.total),
      currency: invoice.currency,
      paymentReference: invoice.paymentReference || "",
    },
    existingIds
  );

  // EU/UK customers always require manual review for Wise
  const customerCountry = invoice.order?.customerCompany || "";
  const euCountries = ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "SE", "NO", "DK", "FI", "AT", "CH"];
  const requireManual = euCountries.some((c) => customerCountry.includes(c));

  if (!validation.valid || requireManual) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "manual_review_required" },
    });
    await prisma.order.update({
      where: { id: invoice.orderId },
      data: { manualReviewRequired: true },
    });
    // Admin task will appear in dashboard automatically since status is manual_review_required
    return NextResponse.json({ ok: true });
  }

  // Auto-approve
  await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      provider: "wise",
      gatewayTransactionId: gatewayId,
      amount: transfer.amount?.value || 0,
      currency: transfer.amount?.currency || "",
      status: "confirmed",
      rawWebhook: event,
    },
  });

  await markInvoicePaid(invoice.id, transfer.amount?.value || 0, gatewayId, "wise");
  await prisma.order.update({ where: { id: invoice.orderId }, data: { status: "processing" } });

  if (process.env.N8N_BASE_URL) {
    await fetch(`${process.env.N8N_BASE_URL}/webhook/payment-confirmed`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET || "" },
      body: JSON.stringify({ orderId: invoice.orderId, provider: "wise" }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
