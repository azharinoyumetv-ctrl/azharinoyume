import { prisma } from "@/lib/prisma";

export async function assertPaymentConfirmed(orderId: string): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  if (!invoice) throw new Error("No invoice found for order");
  if (invoice.status !== "paid" && !invoice.status.includes("payment_confirmed")) {
    throw new Error(`Payment not confirmed. Invoice status: ${invoice.status}`);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.manualReviewRequired && !order.adminApproved) {
    throw new Error("Manual payment review required. Awaiting admin approval.");
  }
}

export function getPaymentProvider(country?: string, currency?: string): string {
  const idCountries = ["ID", "PH", "MY", "SG", "TH", "VN"];
  const euCountries = ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "SE", "NO", "DK", "FI", "AT", "CH"];

  if (country && idCountries.includes(country.toUpperCase())) return "xendit";
  if (country && euCountries.includes(country.toUpperCase())) return "payoneer";
  return "payoneer";
}

export function shouldRequireManualWiseApproval(country?: string): boolean {
  const euCountries = ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "SE", "NO", "DK", "FI", "AT", "CH"];
  if (!country) return true;
  return euCountries.includes(country.toUpperCase());
}

export function validateWisePayment(transaction: {
  amount: number;
  currency: string;
  reference: string;
  status: string;
  gatewayTransactionId: string;
}, invoice: {
  total: number;
  currency: string;
  paymentReference: string;
}, existingTransactionIds: string[]): { valid: boolean; reason?: string } {
  if (Math.abs(transaction.amount - Number(invoice.total)) > 0.01) {
    return { valid: false, reason: `Amount mismatch: received ${transaction.amount}, expected ${invoice.total}` };
  }
  if (transaction.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
    return { valid: false, reason: `Currency mismatch: received ${transaction.currency}, expected ${invoice.currency}` };
  }
  if (!transaction.reference.includes(invoice.paymentReference || "")) {
    return { valid: false, reason: `Reference mismatch: received "${transaction.reference}"` };
  }
  if (!["confirmed", "credited", "completed"].includes(transaction.status.toLowerCase())) {
    return { valid: false, reason: `Transaction not confirmed: status is ${transaction.status}` };
  }
  if (existingTransactionIds.includes(transaction.gatewayTransactionId)) {
    return { valid: false, reason: "Duplicate transaction ID" };
  }
  return { valid: true };
}
