import { releaseReservation } from "@/lib/billing/wallet";
import { prisma } from "@/lib/prisma";
import { abortMultipartUpload, deleteFromR2 } from "@/lib/storage/r2";

export async function runMaintenance() {
  await releaseExpiredReservations();
  await cleanupExpiredUploads();
  await cleanupExpiredDeliveries();
  await expireCreditLots();
}

async function releaseExpiredReservations() {
  const expired = await prisma.creditReservation.findMany({ where: { status: "ACTIVE", expiresAt: { lte: new Date() } }, select: { id: true } });
  for (const item of expired) await releaseReservation(item.id, "Reservation expired").catch(console.error);
}

async function cleanupExpiredUploads() {
  const sessions = await prisma.uploadSession.findMany({ where: { status: "CREATED", expiresAt: { lte: new Date() } }, include: { asset: true } });
  for (const session of sessions) {
    await abortMultipartUpload(session.asset.r2Key, session.providerUploadId).catch(() => {});
    await prisma.$transaction([prisma.uploadSession.update({ where: { id: session.id }, data: { status: "EXPIRED" } }), prisma.uploadedAsset.update({ where: { id: session.assetId }, data: { status: "EXPIRED" } })]);
  }
  const assets = await prisma.uploadedAsset.findMany({ where: { status: { in: ["VERIFIED", "REJECTED", "UPLOADED"] }, expiresAt: { lte: new Date() }, r2Key: { not: "" } } });
  for (const asset of assets) {
    await deleteFromR2(asset.r2Key).catch(() => {});
    await prisma.uploadedAsset.update({ where: { id: asset.id }, data: { status: "DELETED" } });
  }
}

async function cleanupExpiredDeliveries() {
  const deliveries = await prisma.deliveryLink.findMany({ where: { expiresAt: { lte: new Date() }, r2Key: { not: null } } });
  for (const delivery of deliveries) {
    if (delivery.r2Key) await deleteFromR2(delivery.r2Key).catch(() => {});
    await prisma.deliveryLink.update({ where: { id: delivery.id }, data: { r2Key: null, signedUrl: null } });
  }
}

async function expireCreditLots() {
  const lots = await prisma.creditLot.findMany({ where: { status: "ACTIVE", expiresAt: { lte: new Date() }, remainingCredits: { gt: 0 } } });
  for (const lot of lots) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.creditLot.findUnique({ where: { id: lot.id } });
      if (!current || current.status !== "ACTIVE" || !current.remainingCredits) return;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: current.walletId } });
      const decrement = Math.min(current.remainingCredits, Math.max(0, wallet.availableCredits));
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { availableCredits: { decrement }, version: { increment: 1 } } });
      await tx.creditLot.update({ where: { id: current.id }, data: { status: "EXPIRED", remainingCredits: 0 } });
      await tx.creditLedgerEntry.create({ data: { walletId: wallet.id, userId: current.userId, lotId: current.id, entryType: "EXPIRE", amount: -decrement, availableAfter: updated.availableCredits, reservedAfter: updated.reservedCredits, idempotencyKey: `lot:${current.id}:expire` } });
    }).catch(console.error);
  }
}
