import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl, BUCKET, R2Keys } from "@/lib/storage/r2";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = { url: REDIS_URL };

const RENDER_SERVICE = process.env.RENDER_SERVICE_URL || "http://127.0.0.1:4000";
const RENDER_SECRET = process.env.RENDER_SERVICE_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function processRenderJob(job: Job) {
  const { orderId, renderId } = job.data as { orderId: string; renderId: string };

  const render = await prisma.render.findUnique({ where: { id: renderId } });
  if (!render) throw new Error(`Render ${renderId} not found`);

  await prisma.render.update({ where: { id: renderId }, data: { status: "processing", startedAt: new Date() } });
  await prisma.order.update({ where: { id: orderId }, data: { status: "processing" } });
  await job.updateProgress(10);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  // Get a short-lived presigned URL for the raw upload so the render service can fetch it
  const rawKey = R2Keys.rawUpload(order.userId || orderId, orderId, "upload.mp4");
  const videoUrl = await getSignedDownloadUrl(rawKey, 3 * 3600); // 3h — enough for render

  const draftKey = R2Keys.draft(orderId, 1);
  const outputKey = draftKey;

  // Map order style to Remotion composition ID
  const compositionId = styleToComposition(order.visualStyle || "cinematic");

  // Build inputProps from order data
  const inputProps = {
    videoUrl,
    title: order.purpose || "",
    subtitle: order.customerCompany || "",
    accentColor: "#d4a017",
    showLowerThird: !!(order.purpose),
    zoomStart: 1.0,
    zoomEnd: 1.04,
    vignette: true,
  };

  // Submit to Remotion render service
  const webhookUrl = `${APP_URL}/api/n8n/render-callback`;

  const submitRes = await fetch(`${RENDER_SERVICE}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-render-secret": RENDER_SECRET },
    body: JSON.stringify({
      jobId: orderId,
      compositionId,
      inputProps,
      outputKey,
      webhookUrl,
      fps: order.frameRate === "60fps" ? 60 : order.frameRate === "24fps" ? 24 : 30,
      width: order.resolution === "4K" ? 3840 : order.resolution === "720p" ? 1280 : 1920,
      height: order.resolution === "4K" ? 2160 : order.resolution === "720p" ? 720 : 1080,
      concurrency: 2,
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Render service rejected job: ${err}`);
  }

  await job.updateProgress(20);

  // Poll for completion (render service fires webhook, but also poll as fallback)
  const MAX_WAIT_MS = 45 * 60 * 1000; // 45 minutes max
  const POLL_INTERVAL_MS = 15_000;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${RENDER_SERVICE}/status/${orderId}`, {
      headers: { "x-render-secret": RENDER_SECRET },
    });
    const status = await statusRes.json() as { status: string };

    if (status.status === "not_found" || status.status === "completed") break;
    if (status.status === "failed") throw new Error("Render service reported failure");

    await job.updateProgress(30); // keeps BullMQ heartbeat alive
  }

  // Create a 48h signed download URL for the draft
  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: draftKey }),
    { expiresIn: 48 * 3600 }
  );

  await prisma.deliveryLink.create({
    data: {
      orderId,
      signedUrl,
      r2Key: draftKey,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    },
  });

  await prisma.render.update({
    where: { id: renderId },
    data: { status: "completed", completedAt: new Date(), outputR2Key: draftKey },
  });

  await prisma.order.update({ where: { id: orderId }, data: { status: "draft_review" } });

  // Log render cost
  await prisma.costLog.create({
    data: {
      orderId,
      costType: "render",
      amount: 0.12, // estimate — Remotion on VPS is ~$0.10-0.15/video
      currency: "USD",
      description: `Remotion render: ${compositionId}`,
    },
  });

  // Notify customer by email via n8n send-email
  await fetch(`${APP_URL}/api/n8n/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET! },
    body: JSON.stringify({ orderId, type: "draft_ready", signedUrl }),
  }).catch(() => {});

  return { ok: true, draftKey };
}

function styleToComposition(style: string): string {
  const map: Record<string, string> = {
    cinematic: "cinematic",
    anime: "anime",
    minimal: "minimal",
    corporate: "corporate",
    energetic: "energetic",
    emotional: "cinematic", // falls back to cinematic grade
    documentary: "cinematic",
    "social-media": "energetic",
    product: "minimal",
    event: "energetic",
    music: "anime",
  };
  return map[style.toLowerCase()] || "cinematic";
}

export function startWorker() {
  const worker = new Worker("render", processRenderJob, { connection, concurrency: 2 });

  worker.on("completed", (job) => console.log(`[worker] Job ${job.id} completed`));
  worker.on("failed", async (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.renderId) {
      await prisma.render.update({
        where: { id: job.data.renderId },
        data: { status: "failed", errorLog: err.message },
      }).catch(() => {});
    }
  });

  console.log("[worker] Render worker started (Remotion mode)");
  return worker;
}
