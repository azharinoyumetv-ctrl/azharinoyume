import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { consumeReservation, releaseReservation } from "@/lib/billing/wallet";
import { getSignedDownloadUrl, headR2Object } from "@/lib/storage/r2";
import { FINAL_RENDER_RETENTION_MS } from "@/lib/storage/retention";
import { redisConnection } from "@/lib/queue/queues";
import { sendOperationalAlert } from "@/lib/notifications/send";

const serviceUrl = process.env.RENDER_SERVICE_URL || "http://127.0.0.1:4100";
const secret = process.env.RENDER_SERVICE_SECRET || "";

type JobData = { orderId: string; renderId: string; reservationId: string };
type ServiceStatus = { status: "QUEUED" | "RENDERING" | "UPLOADING" | "SUCCEEDED" | "FAILED"; progress: number; r2Key?: string; checksum?: string; durationMs?: number; error?: string; errorCode?: string };

async function processRenderJob(job: Job<JobData>) {
  if (!secret) throw new Error("RENDER_SERVICE_SECRET is required");
  const { orderId, renderId, reservationId } = job.data;
  const attemptNumber = job.attemptsMade + 1;
  const attempt = await prisma.renderAttempt.upsert({
    where: { renderId_attempt: { renderId, attempt: attemptNumber } },
    create: { renderId, attempt: attemptNumber, workerJobId: `${job.id}:${attemptNumber}`, status: "PREPARING", startedAt: new Date(), heartbeatAt: new Date() },
    update: { status: "PREPARING", startedAt: new Date(), heartbeatAt: new Date(), errorCode: null, errorMessage: null },
  });
  const [render, order, asset] = await Promise.all([
    prisma.render.findUnique({ where: { id: renderId } }),
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.uploadedAsset.findFirst({ where: { orderId, status: "VERIFIED" }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!render || !order || !asset) throw new Error("Render, order, or verified input asset is missing");
  await prisma.$transaction([
    prisma.render.update({ where: { id: renderId }, data: { status: "PREPARING", startedAt: new Date(), progress: 1, leaseExpiresAt: new Date(Date.now() + 2 * 60_000) } }),
    prisma.order.update({ where: { id: orderId }, data: { status: "RENDERING" } }),
  ]);
  const videoUrl = await getSignedDownloadUrl(asset.r2Key, 3 * 3600);
  const props = { videoUrl, title: order.purpose || "", subtitle: order.customerCompany || "", accentColor: "#d4a017", showLowerThird: !!order.purpose, zoomStart: 1, zoomEnd: 1.04, vignette: true };
  const compositionId = styleToComposition(order.visualStyle || "cinematic");
  const response = await fetch(`${serviceUrl}/render`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-render-secret": secret },
    body: JSON.stringify({ jobId: attempt.id, compositionId, inputProps: props, outputKey: render.outputR2Key, fps: parseFps(order.frameRate), width: order.resolution.includes("4K") ? 3840 : order.resolution.includes("720") ? 1280 : 1920, height: order.resolution.includes("4K") ? 2160 : order.resolution.includes("720") ? 720 : 1080, concurrency: 2 }),
  });
  if (!response.ok) throw new Error(`Render service rejected attempt: ${await response.text()}`);

  const deadline = Date.now() + 45 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const statusResponse = await fetch(`${serviceUrl}/status/${attempt.id}`, { headers: { "x-render-secret": secret } });
    if (statusResponse.status === 404) continue;
    if (!statusResponse.ok) throw new Error(`Render status check failed: ${statusResponse.status}`);
    const status = await statusResponse.json() as ServiceStatus;
    await Promise.all([
      job.updateProgress(status.progress || 1),
      prisma.render.update({ where: { id: renderId }, data: { status: status.status, progress: status.progress || 1, leaseExpiresAt: new Date(Date.now() + 2 * 60_000) } }),
      prisma.renderAttempt.update({ where: { id: attempt.id }, data: { status: status.status, progress: status.progress || 1, heartbeatAt: new Date() } }),
    ]);
    if (status.status === "FAILED") throw new Error(`${status.errorCode || "RENDER_FAILED"}: ${status.error || "Renderer failed"}`);
    if (status.status !== "SUCCEEDED") continue;
    if (!status.r2Key || status.r2Key !== render.outputR2Key) throw new Error("Renderer returned an unexpected output key");
    const head = await headR2Object(status.r2Key);
    if (!head.ContentLength || Number(head.ContentLength) <= 0) throw new Error("Renderer reported success but the output object is missing or empty");
    const actualCredits = render.reservedCredits;
    await consumeReservation(reservationId, actualCredits);
    await prisma.$transaction([
      prisma.renderAttempt.update({ where: { id: attempt.id }, data: { status: "SUCCEEDED", progress: 100, outputR2Key: status.r2Key, checksum: status.checksum, completedAt: new Date() } }),
      prisma.render.update({ where: { id: renderId }, data: { status: "SUCCEEDED", progress: 100, completedAt: new Date(), outputR2Key: status.r2Key, outputChecksum: status.checksum, actualCredits, leaseExpiresAt: null } }),
      prisma.order.update({ where: { id: orderId }, data: { status: "DRAFT_REVIEW", actualCredits } }),
      prisma.deliveryLink.create({ data: { orderId, r2Key: status.r2Key, expiresAt: new Date(Date.now() + FINAL_RENDER_RETENTION_MS) } }),
    ]);
    return { renderId, r2Key: status.r2Key, checksum: status.checksum };
  }
  throw new Error("Render attempt timed out after 45 minutes");
}

function parseFps(value: string) { return value.includes("60") ? 60 : value.includes("24") ? 24 : 30; }
function styleToComposition(style: string) {
  const normalized = style.toLowerCase();
  if (normalized.includes("anime")) return "anime";
  if (normalized.includes("minimal") || normalized.includes("product")) return "minimal";
  if (normalized.includes("corporate")) return "corporate";
  if (normalized.includes("energetic") || normalized.includes("viral") || normalized.includes("social")) return "energetic";
  return "cinematic";
}

export function startWorker() {
  const worker = new Worker<JobData>("render", processRenderJob, { connection: redisConnection, concurrency: 2, lockDuration: 120_000, stalledInterval: 30_000, maxStalledCount: 1 });
  worker.on("completed", (job) => console.log(`[worker] Render ${job.id} completed`));
  worker.on("failed", async (job, error) => {
    console.error(`[worker] Render ${job?.id} failed:`, error.message);
    if (!job) return;
    const exhausted = job.attemptsMade >= Number(job.opts.attempts || 1);
    await prisma.render.update({ where: { id: job.data.renderId }, data: { status: exhausted ? "FAILED" : "QUEUED", errorLog: error.message, leaseExpiresAt: null } }).catch(() => {});
    if (exhausted) {
      await releaseReservation(job.data.reservationId, error.message).catch(() => {});
      await prisma.order.update({ where: { id: job.data.orderId }, data: { status: "RENDER_FAILED", manualReviewRequired: true } }).catch(() => {});
      await prisma.reviewTask.create({ data: { orderId: job.data.orderId, reason: "Renderer exhausted all retries", riskScore: 90 } }).catch(() => {});
      const failedOrder = await prisma.order.findUnique({ where: { id: job.data.orderId }, select: { userId: true, orderNumber: true } }).catch(() => null);
      await Promise.allSettled([
        sendOperationalAlert({ type: "RENDER_FAILED", title: `Render failed: ${failedOrder?.orderNumber || job.data.orderId}`, body: "All automatic render attempts failed. The project was moved to human review.", url: `/en/admin/orders/${job.data.orderId}` }),
        ...(failedOrder?.userId ? [sendOperationalAlert({ userId: failedOrder.userId, type: "RENDER_DELAYED", title: "Your render needs a manual check", body: "We could not complete the automatic render and our team has been alerted. Your reserved credits were released.", url: `/en/order/${job.data.orderId}` })] : []),
      ]);
    }
  });
  console.log("[worker] Durable render worker started");
  return worker;
}
