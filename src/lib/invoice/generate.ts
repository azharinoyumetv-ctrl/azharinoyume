import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber, formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@prisma/client";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export async function createInvoiceForOrder(
  order: Order,
  lineItems: InvoiceLineItem[],
  paymentMethod: string,
  discount = 0
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);
  const invoiceNumber = generateInvoiceNumber();
  const paymentReference = order.orderNumber;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      userId: order.userId,
      status: "pending_payment",
      subtotal,
      discount,
      total,
      currency: order.currency,
      paymentMethod,
      paymentReference,
      expiresAt,
      items: {
        create: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  return invoice;
}

export async function markInvoicePaid(
  invoiceId: string,
  paidAmount: number,
  gatewayTransactionId: string,
  provider: string
) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "paid",
      paidAmount,
      paidAt: new Date(),
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      invoiceId,
      orderId: invoice.orderId,
      entryType: "revenue",
      amount: paidAmount,
      currency: invoice.currency,
      description: `Payment received via ${provider} — ${gatewayTransactionId}`,
    },
  });

  return invoice;
}

export function buildInvoiceHtml(invoice: {
  invoiceNumber: string;
  issuedAt: Date;
  paidAt?: Date | null;
  status: string;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount?: number | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  order: {
    orderNumber: string;
    customerName?: string | null;
    customerEmail: string;
    customerCompany?: string | null;
    package: string;
    deliveryStatus?: string;
  };
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
}): string {
  const isWise = invoice.paymentMethod === "wise";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #d4a017; padding-bottom: 24px; }
  .logo { font-size: 24px; font-weight: 800; color: #d4a017; letter-spacing: -0.5px; }
  .logo span { color: #1a1a2e; }
  .invoice-meta { text-align: right; font-size: 13px; color: #666; }
  .invoice-number { font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: ${invoice.status === 'paid' ? '#d1fae5' : '#fef3c7'}; color: ${invoice.status === 'paid' ? '#065f46' : '#92400e'}; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
  .customer-name { font-size: 18px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8f6f0; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
  td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .total-row td { font-weight: 700; font-size: 16px; border-bottom: none; border-top: 2px solid #d4a017; padding-top: 16px; }
  .wise-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-top: 24px; }
  .wise-box h3 { color: #92400e; margin: 0 0 12px; font-size: 14px; }
  .wise-ref { font-family: monospace; font-size: 18px; font-weight: 700; background: #fff; padding: 8px 16px; border: 2px solid #d4a017; border-radius: 4px; display: inline-block; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #999; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">azhari<span>noyume</span></div>
    <div style="font-size:12px;color:#999;margin-top:4px;">AI Video Editing Studio</div>
    <div style="font-size:12px;color:#999;">azharinoyume.cloud</div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-number">${invoice.invoiceNumber}</div>
    <div style="margin-top:8px;"><span class="status-badge">${invoice.status.replace(/_/g, " ")}</span></div>
    <div style="margin-top:8px;">Issued: ${formatDate(invoice.issuedAt)}</div>
    ${invoice.paidAt ? `<div>Paid: ${formatDate(invoice.paidAt)}</div>` : ""}
  </div>
</div>

<div style="display:flex;gap:48px;margin-bottom:32px;">
  <div class="section">
    <div class="section-title">Billed To</div>
    <div class="customer-name">${invoice.order.customerName || "Customer"}</div>
    <div style="font-size:13px;color:#666;">${invoice.order.customerEmail}</div>
    ${invoice.order.customerCompany ? `<div style="font-size:13px;color:#666;">${invoice.order.customerCompany}</div>` : ""}
  </div>
  <div class="section">
    <div class="section-title">Order Details</div>
    <div style="font-size:13px;"><strong>Order:</strong> ${invoice.order.orderNumber}</div>
    <div style="font-size:13px;"><strong>Package:</strong> ${invoice.order.package.toUpperCase()}</div>
    <div style="font-size:13px;"><strong>Payment:</strong> ${invoice.paymentMethod || "—"}</div>
  </div>
</div>

<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${invoice.items.map((item) => `
    <tr>
      <td>${item.description}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.unitPrice, invoice.currency)}</td>
      <td style="text-align:right">${formatCurrency(item.total, invoice.currency)}</td>
    </tr>`).join("")}
    ${invoice.discount > 0 ? `<tr><td colspan="3" style="text-align:right;color:#666;">Discount</td><td style="text-align:right;color:#059669;">-${formatCurrency(invoice.discount, invoice.currency)}</td></tr>` : ""}
  </tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="3" style="text-align:right;">Total ${invoice.currency}</td>
      <td style="text-align:right;">${formatCurrency(invoice.total, invoice.currency)}</td>
    </tr>
  </tfoot>
</table>

${isWise ? `
<div class="wise-box">
  <h3>⚠️ Bank Transfer Payment Instructions</h3>
  <p style="font-size:13px;margin:0 0 12px;">Please transfer exactly <strong>${formatCurrency(invoice.total, invoice.currency)}</strong> and include this reference in your payment:</p>
  <div class="wise-ref">${invoice.paymentReference}</div>
  <p style="font-size:12px;color:#92400e;margin:12px 0 0;">Your order will not be processed until payment is received and verified with this exact reference.</p>
</div>` : ""}

<div class="footer">
  <p>Thank you for choosing Azharinoyume AI Video Editing Studio.</p>
  <p>Questions? Contact us at support@azharinoyume.cloud</p>
</div>
</body>
</html>`;
}
