import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { grantPaidCredits, reversePaymentCredits } from "@/lib/billing/wallet";
import {
  type MidtransWebhook,
  parseMidtransWebhook,
  verifyMidtransWebhook,
} from "@/lib/payment/midtrans";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: MidtransWebhook;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseMidtransWebhook(body);
  const valid = verifyMidtransWebhook(body);
  const providerEventId = [
    parsed.transactionId || parsed.referenceId || "unmatched",
    parsed.status || "UNKNOWN",
    sha256(raw),
  ].join(":");
  const event = await prisma.paymentEvent.upsert({
    where: {
      provider_providerEventId: { provider: "midtrans", providerEventId },
    },
    create: {
      provider: "midtrans",
      providerEventId,
      eventType: parsed.status || "UNKNOWN",
      headersHash: sha256(JSON.stringify(Object.fromEntries(request.headers))),
      signatureValid: valid,
      payload: body as unknown as Prisma.InputJsonValue,
      status: valid ? "VERIFIED" : "REJECTED",
      failureReason: valid ? null : "Invalid Midtrans signature",
    },
    update: valid
      ? { signatureValid: true, status: "VERIFIED", failureReason: null }
      : {},
  });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!parsed.referenceId) {
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: {
        status: "REJECTED",
        failureReason: "Missing order identifier",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ received: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { provider: "midtrans", referenceId: parsed.referenceId },
  });
  if (!payment || (event.paymentId && event.status === "PROCESSED")) {
    return NextResponse.json({ received: true });
  }
  if (
    !Number.isFinite(parsed.amount) ||
    parsed.amount !== payment.idrAmount ||
    parsed.currency !== "IDR"
  ) {
    await prisma.paymentEvent.update({
      where: { id: event.id },
      data: {
        paymentId: payment.id,
        status: "REJECTED",
        failureReason: "Amount or currency mismatch",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ received: true });
  }

  const acceptedCapture =
    parsed.status === "CAPTURE" && parsed.fraudStatus === "ACCEPT";
  if (parsed.status === "SETTLEMENT" || acceptedCapture) {
    await grantPaidCredits(
      payment.id,
      providerEventId,
      undefined,
      parsed.transactionId || undefined,
    );
  } else if (parsed.status === "REFUND" && payment.status === "PAID") {
    await reversePaymentCredits(payment.id, providerEventId, "REFUND");
  } else if (parsed.status === "CHARGEBACK" && payment.status === "PAID") {
    await reversePaymentCredits(payment.id, providerEventId, "CHARGEBACK");
  } else if (payment.status !== "PAID") {
    const nextStatus =
      parsed.status === "DENY"
        ? "FAILED"
        : parsed.status === "CANCEL"
          ? "CANCELLED"
          : parsed.status === "EXPIRE"
            ? "EXPIRED"
            : "PENDING_ACTION";
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: nextStatus },
    });
  }

  await prisma.paymentEvent.update({
    where: { id: event.id },
    data: {
      paymentId: payment.id,
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });
  return NextResponse.json({ received: true });
}
