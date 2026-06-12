import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markInvoicePaid } from "@/lib/invoice/generate";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, notes } = await req.json();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.manualReviewRequired) return NextResponse.json({ error: "No manual review required" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { orderId, status: "manual_review_required" },
  });
  if (!invoice) return NextResponse.json({ error: "No invoice in review" }, { status: 404 });

  // Admin explicitly approves
  await prisma.$transaction([
    prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.id,
        orderId,
        provider: "wise",
        gatewayTransactionId: `manual_${orderId}_${Date.now()}`,
        amount: Number(invoice.total),
        currency: invoice.currency,
        status: "manual_approved",
        adminApprovedBy: session.user.id,
        rawWebhook: { manual: true, adminId: session.user.id, notes },
      },
    }),
    prisma.adminApproval.create({
      data: {
        approvalType: "wise_payment",
        targetId: orderId,
        adminId: session.user.id,
        decision: "approved",
        notes: notes || null,
      },
    }),
    prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: "approve_wise_payment",
        targetType: "order",
        targetId: orderId,
        notes,
      },
    }),
  ]);

  await markInvoicePaid(invoice.id, Number(invoice.total), `manual_${orderId}`, "wise");
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "processing", adminApproved: true, manualReviewRequired: false },
  });

  // Trigger n8n
  if (process.env.N8N_BASE_URL) {
    await fetch(`${process.env.N8N_BASE_URL}/webhook/payment-confirmed`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET || "" },
      body: JSON.stringify({ orderId, provider: "wise_manual", adminApproved: true }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
