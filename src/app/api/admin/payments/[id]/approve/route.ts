import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireAdmin } from "@/lib/api/authz";
import { grantPaidCredits } from "@/lib/billing/wallet";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security/crypto";

const Schema = z.object({ confirmationId: z.string().trim().min(4).max(100) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { confirmationId } = Schema.parse(await request.json());
    const payment = await prisma.payment.findUnique({ where: { id }, include: { quote: { include: { product: true } } } });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.provider !== "payoneer") throw new ApiError(409, "Only Payoneer payments use manual reconciliation");
    if (payment.quote.product.kind !== "PACK") throw new ApiError(409, "Manual reconciliation is limited to one-time credit packs");
    if (payment.status === "PAID") return NextResponse.json({ id: payment.id, status: payment.status });
    if (payment.status !== "PENDING_ACTION") throw new ApiError(409, "Payment is not awaiting reconciliation");
    const duplicate = await prisma.payment.findFirst({ where: { provider: "payoneer", providerPaymentId: confirmationId, id: { not: payment.id } } });
    if (duplicate) throw new ApiError(409, "This Payoneer confirmation ID is already in use");

    const providerEventId = `manual:${confirmationId}`;
    const priorEvent = await prisma.paymentEvent.findUnique({ where: { provider_providerEventId: { provider: "payoneer", providerEventId } } });
    if (priorEvent?.paymentId && priorEvent.paymentId !== payment.id) throw new ApiError(409, "This Payoneer confirmation was applied to another payment");
    const event = priorEvent || await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        provider: "payoneer",
        providerEventId,
        eventType: "MANUAL_RECONCILIATION",
        headersHash: sha256(JSON.stringify({ adminId: admin.id, source: "admin" })),
        signatureValid: true,
        payload: { confirmationId, approvedBy: admin.id, verification: "admin" },
        status: "VERIFIED",
      },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: confirmationId, networkTransactionId: confirmationId } });
    const paid = await grantPaidCredits(payment.id, providerEventId);
    await prisma.$transaction([
      prisma.paymentEvent.update({ where: { id: event.id }, data: { paymentId: payment.id, status: "PROCESSED", processedAt: new Date() } }),
      prisma.auditEvent.create({ data: { actorId: admin.id, action: "PAYONEER_PAYMENT_RECONCILED", targetType: "Payment", targetId: payment.id, metadata: { confirmationId } } }),
    ]);
    return NextResponse.json({ id: paid.id, status: paid.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "A valid Payoneer confirmation ID is required" }, { status: 400 });
    return apiError(error);
  }
}
