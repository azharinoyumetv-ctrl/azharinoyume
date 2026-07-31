import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/authz";

const SERIALIZABLE = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;

export async function grantPaidCredits(paymentId: string, providerEventId: string, paymentTokenId?: string, networkTransactionId?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { quote: { include: { product: true, order: { include: { invoices: { orderBy: { createdAt: "desc" }, take: 1 } } } } } } });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status === "PAID") return payment;
    if (payment.quote.product.kind === "PROJECT") {
      const order = payment.quote.order;
      const invoice = order?.invoices[0];
      if (!order || !invoice) throw new ApiError(409, "Project payment is not connected to an invoice");
      const paidAt = new Date();
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt,
          paymentTokenId: paymentTokenId || payment.paymentTokenId,
          networkTransactionId: networkTransactionId || payment.networkTransactionId,
          quote: { update: { status: "PAID" } },
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          paidAmount: payment.quote.usdCents / 100,
          paidAt,
          paymentMethod: payment.provider,
          paymentReference: payment.referenceId,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "ANALYSIS_QUEUED" },
      });
      await tx.queueJob.create({
        data: {
          orderId: order.id,
          jobType: "MEDIA_ANALYSIS",
          status: "pending",
          priority: order.package === "premium" ? 20 : order.package === "plus" ? 10 : 0,
        },
      });
      const priorTransaction = await tx.paymentTransaction.findFirst({
        where: { gatewayTransactionId: payment.providerPaymentId || payment.referenceId },
      });
      if (!priorTransaction) {
        await tx.paymentTransaction.create({
          data: {
            invoiceId: invoice.id,
            orderId: order.id,
            provider: payment.provider,
            gatewayTransactionId: payment.providerPaymentId || payment.referenceId,
            amount: payment.quote.usdCents / 100,
            currency: "USD",
            status: "paid",
          },
        });
      }
      return updatedPayment;
    }
    const wallet = await tx.wallet.upsert({ where: { userId: payment.userId }, create: { userId: payment.userId }, update: {} });
    const isSubscription = payment.quote.product.kind === "SUBSCRIPTION";
    const lot = await tx.creditLot.create({
      data: { walletId: wallet.id, userId: payment.userId, paymentId: payment.id, subscriptionId: payment.subscriptionId, type: isSubscription ? "SUBSCRIPTION" : "PURCHASED", issuedCredits: payment.quote.credits, remainingCredits: payment.quote.credits, expiresAt: isSubscription ? new Date(Date.now() + 60 * 86400_000) : null },
    });
    const updatedWallet = await tx.wallet.update({ where: { id: wallet.id }, data: { availableCredits: { increment: payment.quote.credits }, version: { increment: 1 } } });
    await tx.creditLedgerEntry.create({
      data: { walletId: wallet.id, userId: payment.userId, lotId: lot.id, entryType: "GRANT", amount: payment.quote.credits, availableAfter: updatedWallet.availableCredits, reservedAfter: updatedWallet.reservedCredits, idempotencyKey: `payment:${payment.id}:grant`, metadata: { provider: payment.provider, providerEventId } },
    });
    if (payment.subscriptionId) {
      await tx.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "ACTIVE", paymentTokenId: paymentTokenId || payment.paymentTokenId, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000), nextBillingAt: new Date(Date.now() + 30 * 86400_000), retryCount: 0 } });
    }
    return tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), paymentTokenId: paymentTokenId || payment.paymentTokenId, networkTransactionId: networkTransactionId || payment.networkTransactionId, quote: { update: { status: "PAID" } } } });
  }, SERIALIZABLE);
}

export async function reserveCredits(userId: string, orderId: string, credits: number, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.creditReservation.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.availableCredits < credits) throw new ApiError(402, "Insufficient credits");
    const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { availableCredits: { decrement: credits }, reservedCredits: { increment: credits }, version: { increment: 1 } } });
    const reservation = await tx.creditReservation.create({ data: { walletId: wallet.id, userId, orderId, idempotencyKey, reservedCredits: credits, expiresAt: new Date(Date.now() + 2 * 3600_000) } });
    await tx.creditLedgerEntry.create({ data: { walletId: wallet.id, userId, reservationId: reservation.id, entryType: "RESERVE", amount: -credits, availableAfter: updated.availableCredits, reservedAfter: updated.reservedCredits, idempotencyKey: `reservation:${reservation.id}:create` } });
    return reservation;
  }, SERIALIZABLE);
}

export async function releaseReservation(reservationId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.creditReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.status !== "ACTIVE") return reservation;
    const updated = await tx.wallet.update({ where: { id: reservation.walletId }, data: { availableCredits: { increment: reservation.reservedCredits }, reservedCredits: { decrement: reservation.reservedCredits }, version: { increment: 1 } } });
    await tx.creditLedgerEntry.create({ data: { walletId: reservation.walletId, userId: reservation.userId, reservationId, entryType: "RELEASE", amount: reservation.reservedCredits, availableAfter: updated.availableCredits, reservedAfter: updated.reservedCredits, idempotencyKey: `reservation:${reservationId}:release`, metadata: { reason } } });
    return tx.creditReservation.update({ where: { id: reservationId }, data: { status: "RELEASED" } });
  }, SERIALIZABLE);
}

export async function consumeReservation(reservationId: string, actualCredits: number) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.creditReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.status !== "ACTIVE") throw new ApiError(409, "Credit reservation is not active");
    if (actualCredits > reservation.reservedCredits) throw new ApiError(409, "Actual render cost exceeds the reserved amount");
    const lots = await tx.creditLot.findMany({ where: { walletId: reservation.walletId, status: "ACTIVE", remainingCredits: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }] });
    let remaining = actualCredits;
    for (const lot of lots) {
      if (!remaining) break;
      const used = Math.min(remaining, lot.remainingCredits);
      await tx.creditLot.update({ where: { id: lot.id }, data: { remainingCredits: { decrement: used } } });
      remaining -= used;
    }
    if (remaining) throw new ApiError(409, "Credit lots no longer cover the reservation");
    const released = reservation.reservedCredits - actualCredits;
    const updated = await tx.wallet.update({ where: { id: reservation.walletId }, data: { reservedCredits: { decrement: reservation.reservedCredits }, availableCredits: { increment: released }, version: { increment: 1 } } });
    await tx.creditLedgerEntry.create({ data: { walletId: reservation.walletId, userId: reservation.userId, reservationId, entryType: "CONSUME", amount: -actualCredits, availableAfter: updated.availableCredits, reservedAfter: updated.reservedCredits, idempotencyKey: `reservation:${reservationId}:consume`, metadata: { released } } });
    return tx.creditReservation.update({ where: { id: reservationId }, data: { status: "CONSUMED", consumedCredits: actualCredits } });
  }, SERIALIZABLE);
}

export async function reversePaymentCredits(paymentId: string, providerEventId: string, reason: "REFUND" | "CHARGEBACK") {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { quote: { include: { product: true, order: { include: { invoices: { orderBy: { createdAt: "desc" }, take: 1 } } } } } } });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.quote.product.kind === "PROJECT") {
      const order = payment.quote.order;
      const invoice = order?.invoices[0];
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: reason === "REFUND" ? "refunded" : "manual_review_required" },
        });
      }
      if (order) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: reason === "REFUND" ? "REFUNDED" : "PAYMENT_DISPUTED",
            manualReviewRequired: reason === "CHARGEBACK",
          },
        });
      }
      return tx.payment.update({ where: { id: paymentId }, data: { status: reason === "REFUND" ? "REFUNDED" : "CHARGEBACK" } });
    }
    const lot = await tx.creditLot.findUnique({ where: { paymentId } });
    if (!lot || lot.status === "REVERSED") return payment;
    const wallet = await tx.wallet.update({ where: { id: lot.walletId }, data: { availableCredits: { decrement: lot.issuedCredits }, version: { increment: 1 } } });
    await tx.creditLot.update({ where: { id: lot.id }, data: { status: "REVERSED", remainingCredits: 0 } });
    await tx.creditLedgerEntry.create({ data: { walletId: wallet.id, userId: lot.userId, lotId: lot.id, entryType: reason, amount: -lot.issuedCredits, availableAfter: wallet.availableCredits, reservedAfter: wallet.reservedCredits, idempotencyKey: `payment:${paymentId}:${reason.toLowerCase()}`, metadata: { providerEventId } } });
    if (payment.subscriptionId) await tx.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "CANCELLED", nextBillingAt: null } });
    return tx.payment.update({ where: { id: paymentId }, data: { status: reason === "REFUND" ? "REFUNDED" : "CHARGEBACK" } });
  }, SERIALIZABLE);
}
