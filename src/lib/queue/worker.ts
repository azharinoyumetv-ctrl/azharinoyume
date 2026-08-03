import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { consumeReservation, releaseReservation } from "@/lib/billing/wallet";
import { getSignedDownloadUrl, headR2Object } from "@/lib/storage/r2";
import { FINAL_RENDER_RETENTION_MS } from "@/lib/storage/retention";
import { redisConnection } from "@/lib/queue/queues";
import { sendOperationalAlert } from "@/lib/notifications/send";
import {
  Editor360ConfigSchema,
  outputDimensions,
} from "@/lib/video360/contracts";
import { recalculateOrderProfit } from "@/lib/accounting/profit";
import { z } from "zod";
import { reviewCreativeOutput } from "@/lib/production/creative-qa";
import { PROJECT_TIERS, type ProjectTier } from "@/lib/production/catalog";

const serviceUrl = process.env.RENDER_SERVICE_URL || "http://127.0.0.1:4100";
const secret = process.env.RENDER_SERVICE_SECRET || "";

type JobData = {
  orderId: string;
  renderId: string;
  reservationId?: string;
  billingMode?: "wallet" | "project";
};
type ServiceStatus = {
  status: "QUEUED" | "RENDERING" | "UPLOADING" | "SUCCEEDED" | "FAILED";
  progress: number;
  r2Key?: string;
  checksum?: string;
  durationMs?: number;
  qa?: {
    checks: {
      playableVideo: boolean;
      dimensionsMatch: boolean;
      frameRateMatch: boolean;
      durationMatch: boolean;
      fileSizeValid: boolean;
    };
    width: number;
    height: number;
    frameRate: number;
    durationSeconds: number;
    fileSizeBytes: number;
    hasAudio: boolean;
  };
  error?: string;
  errorCode?: string;
};

const TimelineManifestSchema = z.object({
  schemaVersion: z.literal("azyume.timeline.v1"),
  targetDurationMs: z.number().int().positive(),
  plan: z.object({
    segments: z.array(z.object({
      sourceStartMs: z.number().int().min(0),
      sourceEndMs: z.number().int().positive(),
      purpose: z.string(),
      treatment: z.string(),
    })).min(1).max(30),
  }),
  captions: z.array(z.object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().positive(),
    text: z.string().min(1).max(2_000),
  })).max(300).default([]),
  creative: z.object({
    musicTrack: z.object({
      id: z.string(),
      r2Key: z.string(),
      licenseId: z.string(),
      volume: z.number().min(0).max(1),
    }).nullable().optional(),
    bRoll: z.array(z.object({
      outputStartMs: z.number().int().min(0),
      durationMs: z.number().int().positive(),
      r2Key: z.string(),
      source: z.enum(["stock", "generated"]),
      licenseId: z.string().optional(),
      prompt: z.string(),
    })).default([]),
    brand: z.object({
      name: z.string().nullable().optional(),
      primaryColor: z.string(),
      secondaryColor: z.string(),
      rules: z.string().nullable().optional(),
    }).optional(),
  }).optional(),
});

function timelineOutputDimensions(aspectRatio: string, resolution: string) {
  const longEdge = resolution.includes("4K")
    ? 3840
    : resolution.includes("1440")
      ? 2560
      : resolution.includes("720")
        ? 1280
        : 1920;
  const even = (value: number) => Math.round(value / 2) * 2;
  if (aspectRatio === "9:16") return { width: even((longEdge * 9) / 16), height: longEdge };
  if (aspectRatio === "1:1") return { width: longEdge, height: longEdge };
  if (aspectRatio === "4:5") return { width: even((longEdge * 4) / 5), height: longEdge };
  return { width: longEdge, height: even((longEdge * 9) / 16) };
}

async function processRenderJob(job: Job<JobData>) {
  if (!secret) throw new Error("RENDER_SERVICE_SECRET is required");
  const { orderId, renderId, reservationId } = job.data;
  const attemptNumber = job.attemptsMade + 1;
  const attempt = await prisma.renderAttempt.upsert({
    where: { renderId_attempt: { renderId, attempt: attemptNumber } },
    create: {
      renderId,
      attempt: attemptNumber,
      workerJobId: `${job.id}:${attemptNumber}`,
      status: "PREPARING",
      startedAt: new Date(),
      heartbeatAt: new Date(),
    },
    update: {
      status: "PREPARING",
      startedAt: new Date(),
      heartbeatAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });
  const [render, order, asset, timelineRecord, briefRecord] = await Promise.all([
    prisma.render.findUnique({ where: { id: renderId } }),
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.uploadedAsset.findFirst({
      where: { orderId, status: "VERIFIED" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.timelineManifest.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.editBrief.findFirst({
      where: { orderId, status: "approved" },
      orderBy: { version: "desc" },
    }),
  ]);
  if (!render || !order || !asset)
    throw new Error("Render, order, or verified input asset is missing");
  await prisma.$transaction([
    prisma.render.update({
      where: { id: renderId },
      data: {
        status: "PREPARING",
        startedAt: new Date(),
        progress: 1,
        leaseExpiresAt: new Date(Date.now() + 2 * 60_000),
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "RENDERING" },
    }),
  ]);
  const videoUrl = await getSignedDownloadUrl(asset.r2Key, 3 * 3600);
  const editor360 =
    order.editingMode === "360"
      ? Editor360ConfigSchema.parse(order.editorConfig)
      : null;
  const timeline = editor360
    ? null
    : TimelineManifestSchema.parse(timelineRecord?.manifest);
  const [musicUrl, bRoll] = timeline
    ? await Promise.all([
        timeline.creative?.musicTrack?.r2Key
          ? getSignedDownloadUrl(timeline.creative.musicTrack.r2Key, 60 * 60)
          : Promise.resolve(null),
        Promise.all((timeline.creative?.bRoll || []).map(async (item) => ({
          ...item,
          videoUrl: await getSignedDownloadUrl(item.r2Key, 60 * 60),
        }))),
      ])
    : [null, []];
  const timelineDurationMs = timeline
    ? timeline.plan.segments.reduce(
        (total, segment) => total + segment.sourceEndMs - segment.sourceStartMs,
        0,
      )
    : null;
  const props = {
    videoUrl,
    title: order.purpose || "",
    subtitle: order.customerCompany || "",
    accentColor: timeline?.creative?.brand?.primaryColor || "#d4a017",
    showLowerThird: !!order.purpose,
    zoomStart: 1,
    zoomEnd: 1.04,
    vignette: true,
    ...(timeline
      ? {
          segments: timeline.plan.segments,
          captions: timeline.captions,
          captionStyle: order.captionStyle || "minimal",
          style: order.visualStyle || "cinematic",
          colorGrade: order.colorGrade || "natural",
          music: musicUrl && timeline.creative?.musicTrack ? {
            url: musicUrl,
            volume: timeline.creative.musicTrack.volume,
          } : null,
          bRoll: bRoll.map((item) => ({
            videoUrl: item.videoUrl,
            startMs: item.outputStartMs,
            durationMs: item.durationMs,
          })),
          brand: timeline.creative?.brand || null,
        }
      : {}),
  };
  const compositionId = editor360
    ? styleToComposition(order.visualStyle || "cinematic")
    : "timeline";
  const renderFps = parseFps(render.frameRate || order.frameRate);
  const dimensions = editor360
    ? outputDimensions(editor360.outputAspectRatio, order.resolution)
    : timelineOutputDimensions(render.aspectRatio || order.aspectRatio || "16:9", render.resolution || order.resolution);
  const response = await fetch(`${serviceUrl}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-render-secret": secret },
    body: JSON.stringify({
      jobId: attempt.id,
      compositionId,
      inputProps: props,
      outputKey: render.outputR2Key,
      fps: renderFps,
      width: dimensions.width,
      height: dimensions.height,
      concurrency: 2,
      ...(timeline && timelineDurationMs
        ? {
            durationInFrames: Math.max(1, Math.ceil((timelineDurationMs / 1_000) * renderFps)),
            processing: {
              kind: "timeline",
              sourceUrl: videoUrl,
              sourceDurationMs: asset.durationMs,
              segments: timeline.plan.segments,
              captions: timeline.captions,
              captionStyle: order.captionStyle || "minimal",
              style: order.visualStyle || "cinematic",
              colorGrade: order.colorGrade || "natural",
            },
          }
        : {}),
      ...(editor360
        ? {
            processing: {
              kind: "360",
              sourceUrl: videoUrl,
              sourceDurationMs: asset.durationMs,
              ...editor360,
            },
          }
        : {}),
    }),
  });
  if (!response.ok)
    throw new Error(
      `Render service rejected attempt: ${await response.text()}`,
    );

  const deadline = Date.now() + 45 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const statusResponse = await fetch(`${serviceUrl}/status/${attempt.id}`, {
      headers: { "x-render-secret": secret },
    });
    if (statusResponse.status === 404) continue;
    if (!statusResponse.ok)
      throw new Error(`Render status check failed: ${statusResponse.status}`);
    const status = (await statusResponse.json()) as ServiceStatus;
    await Promise.all([
      job.updateProgress(status.progress || 1),
      prisma.render.update({
        where: { id: renderId },
        data: {
          status: status.status,
          progress: status.progress || 1,
          leaseExpiresAt: new Date(Date.now() + 2 * 60_000),
        },
      }),
      prisma.renderAttempt.update({
        where: { id: attempt.id },
        data: {
          status: status.status,
          progress: status.progress || 1,
          heartbeatAt: new Date(),
        },
      }),
    ]);
    if (status.status === "FAILED")
      throw new Error(
        `${status.errorCode || "RENDER_FAILED"}: ${status.error || "Renderer failed"}`,
      );
    if (status.status !== "SUCCEEDED") continue;
    if (!status.r2Key || status.r2Key !== render.outputR2Key)
      throw new Error("Renderer returned an unexpected output key");
    const head = await headR2Object(status.r2Key);
    if (!head.ContentLength || Number(head.ContentLength) <= 0)
      throw new Error(
        "Renderer reported success but the output object is missing or empty",
      );
    if (!status.qa || Object.values(status.qa.checks).some((passed) => !passed))
      throw new Error("Renderer reported success without passing technical media QA");
    const actualCredits = reservationId ? render.reservedCredits : 0;
    if (reservationId) await consumeReservation(reservationId, actualCredits);
    const renderDurationSeconds = Math.max(
      1,
      Math.round(Number(status.durationMs || 0) / 1_000),
    );
    const estimatedRenderCostUsd =
      (renderDurationSeconds / 3_600) *
      Number(process.env.SELF_HOSTED_RENDER_USD_PER_HOUR || 0.35);
    const tier = order.package as ProjectTier;
    const creativeQa = tier === "basic"
      ? null
      : await reviewCreativeOutput({
          orderId,
          r2Key: status.r2Key,
          brief: (briefRecord?.structuredBrief && typeof briefRecord.structuredBrief === "object"
            ? briefRecord.structuredBrief
            : {}) as Record<string, unknown>,
          timeline: (timelineRecord?.manifest && typeof timelineRecord.manifest === "object"
            ? timelineRecord.manifest
            : {}) as Record<string, unknown>,
        });
    const creativePassed = !creativeQa || (creativeQa.overallScore >= 70 && !creativeQa.issues.some((issue) => issue.severity === "critical"));
    const renderGroupPrefix = render.idempotencyKey
      ? `${render.idempotencyKey.split(":").slice(0, -1).join(":")}:`
      : null;
    const succeededVariants = await prisma.render.count({
      where: {
        orderId,
        renderType: render.renderType,
        status: "SUCCEEDED",
        id: { not: renderId },
        ...(renderGroupPrefix ? { idempotencyKey: { startsWith: renderGroupPrefix } } : {}),
      },
    });
    const allVariantsComplete = succeededVariants + 1 >= PROJECT_TIERS[tier].outputVariants;
    const requiresHuman = order.manualReviewRequired || tier === "premium" || !creativePassed || Boolean(creativeQa?.requiresHuman);
    const approvalRequired = !creativePassed || (requiresHuman && !order.adminApproved);
    const nextOrderStatus = !allVariantsComplete
      ? render.renderType === "final" ? "FINAL_RENDERING" : "RENDERING"
      : approvalRequired
        ? "PRODUCTION_REVIEW_REQUIRED"
        : render.renderType === "final" ? "DELIVERED" : "DRAFT_REVIEW";
    await prisma.$transaction([
      prisma.renderAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "SUCCEEDED",
          progress: 100,
          outputR2Key: status.r2Key,
          checksum: status.checksum,
          completedAt: new Date(),
        },
      }),
      prisma.render.update({
        where: { id: renderId },
        data: {
          status: "SUCCEEDED",
          progress: 100,
          completedAt: new Date(),
          outputR2Key: status.r2Key,
          outputChecksum: status.checksum,
          actualCredits,
          durationSeconds: renderDurationSeconds,
          leaseExpiresAt: null,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextOrderStatus,
          actualCredits,
          manualReviewRequired: requiresHuman,
        },
      }),
      prisma.qualityCheck.upsert({
        where: { renderId },
        create: {
          orderId,
          renderId,
          qaType: render.renderType,
          status: creativePassed ? "passed" : "review_required",
          checks: {
            outputExists: true,
            outputNonEmpty: true,
            checksumPresent: Boolean(status.checksum),
            ...status.qa.checks,
            width: status.qa.width,
            height: status.qa.height,
            frameRate: status.qa.frameRate,
            durationSeconds: status.qa.durationSeconds,
            fileSizeBytes: status.qa.fileSizeBytes,
            hasAudio: status.qa.hasAudio,
            creativeQa,
          },
          technicalScore: status.checksum ? 100 : 95,
          creativeScore: creativeQa?.overallScore ?? null,
          requiresHuman,
        },
        update: {
          status: creativePassed ? "passed" : "review_required",
          checks: {
            outputExists: true,
            outputNonEmpty: true,
            checksumPresent: Boolean(status.checksum),
            ...status.qa.checks,
            width: status.qa.width,
            height: status.qa.height,
            frameRate: status.qa.frameRate,
            durationSeconds: status.qa.durationSeconds,
            fileSizeBytes: status.qa.fileSizeBytes,
            hasAudio: status.qa.hasAudio,
            creativeQa,
          },
          technicalScore: status.checksum ? 100 : 95,
          creativeScore: creativeQa?.overallScore ?? null,
          requiresHuman,
          completedAt: new Date(),
        },
      }),
      prisma.renderCostLog.create({
        data: {
          renderId,
          orderId,
          worker: "self-hosted-remotion",
          durationSeconds: renderDurationSeconds,
          estimatedCostUsd: estimatedRenderCostUsd,
        },
      }),
      prisma.costLog.create({
        data: {
          orderId,
          costType: "render",
          amount: estimatedRenderCostUsd,
          description: `Self-hosted render estimate for ${renderDurationSeconds} seconds`,
        },
      }),
      prisma.deliveryLink.create({
        data: {
          orderId,
          r2Key: status.r2Key,
          expiresAt: new Date(Date.now() + FINAL_RENDER_RETENTION_MS),
        },
      }),
    ]);
    if (allVariantsComplete && render.renderType === "final" && nextOrderStatus === "DELIVERED") {
      await prisma.invoice.updateMany({ where: { orderId }, data: { deliveryStatus: "delivered" } });
    }
    if (allVariantsComplete && approvalRequired) {
      const openReview = await prisma.reviewTask.findFirst({ where: { orderId, status: "OPEN" } });
      if (!openReview) {
        await prisma.reviewTask.create({
          data: {
            orderId,
            reason: creativePassed ? "Premium or risk-based human QA is required before delivery" : `Creative QA requires correction: ${creativeQa?.issues.map((issue) => issue.message).join("; ").slice(0, 1_500)}`,
            riskScore: creativePassed ? 50 : 80,
          },
        });
      }
    }
    await recalculateOrderProfit(orderId).catch((error) =>
      console.error(
        `[accounting] Profit calculation failed for ${orderId}`,
        error,
      ),
    );
    return { renderId, r2Key: status.r2Key, checksum: status.checksum };
  }
  throw new Error("Render attempt timed out after 45 minutes");
}

function parseFps(value: string) {
  return value.includes("60") ? 60 : value.includes("24") ? 24 : 30;
}
function styleToComposition(style: string) {
  const normalized = style.toLowerCase();
  if (normalized.includes("anime")) return "anime";
  if (normalized.includes("minimal") || normalized.includes("product"))
    return "minimal";
  if (normalized.includes("corporate")) return "corporate";
  if (
    normalized.includes("energetic") ||
    normalized.includes("viral") ||
    normalized.includes("social")
  )
    return "energetic";
  return "cinematic";
}

export function startWorker() {
  const worker = new Worker<JobData>("render", processRenderJob, {
    connection: redisConnection,
    concurrency: 2,
    lockDuration: 120_000,
    stalledInterval: 30_000,
    maxStalledCount: 1,
  });
  worker.on("completed", (job) =>
    console.log(`[worker] Render ${job.id} completed`),
  );
  worker.on("failed", async (job, error) => {
    console.error(`[worker] Render ${job?.id} failed:`, error.message);
    if (!job) return;
    const exhausted = job.attemptsMade >= Number(job.opts.attempts || 1);
    await prisma.render
      .update({
        where: { id: job.data.renderId },
        data: {
          status: exhausted ? "FAILED" : "QUEUED",
          errorLog: error.message,
          leaseExpiresAt: null,
        },
      })
      .catch(() => {});
    if (exhausted) {
      if (job.data.reservationId) {
        await releaseReservation(job.data.reservationId, error.message).catch(
          () => {},
        );
      }
      await prisma.order
        .update({
          where: { id: job.data.orderId },
          data: { status: "RENDER_FAILED", manualReviewRequired: true },
        })
        .catch(() => {});
      await prisma.reviewTask
        .create({
          data: {
            orderId: job.data.orderId,
            reason: "Renderer exhausted all retries",
            riskScore: 90,
          },
        })
        .catch(() => {});
      const failedOrder = await prisma.order
        .findUnique({
          where: { id: job.data.orderId },
          select: { userId: true, orderNumber: true },
        })
        .catch(() => null);
      await Promise.allSettled([
        sendOperationalAlert({
          type: "RENDER_FAILED",
          title: `Render failed: ${failedOrder?.orderNumber || job.data.orderId}`,
          body: "All automatic render attempts failed. The project was moved to human review.",
          url: `/en/admin/orders/${job.data.orderId}`,
        }),
        ...(failedOrder?.userId
          ? [
              sendOperationalAlert({
                userId: failedOrder.userId,
                type: "RENDER_DELAYED",
                title: "Your render needs a manual check",
                body: "We could not complete the automatic render and our team has been alerted. Your payment remains attached to the project while we correct the failure.",
                url: `/en/order/${job.data.orderId}`,
              }),
            ]
          : []),
      ]);
    }
  });
  console.log("[worker] Durable render worker started");
  return worker;
}
