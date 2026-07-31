import { Prisma } from "@/generated/prisma/client";
import { callClaude, translateToEnglish } from "@/lib/ai/claude";
import { prisma } from "@/lib/prisma";
import { getRenderQueue } from "@/lib/queue/queues";
import { R2Keys } from "@/lib/storage/r2";
import { sha256 } from "@/lib/security/crypto";

type PlannedSegment = {
  sourceStartMs: number;
  sourceEndMs: number;
  purpose: string;
  treatment: string;
};

type AutomatedEditPlan = {
  narrative: string;
  hook: string;
  segments: PlannedSegment[];
  captionDirection: string;
  musicDirection: string;
  colorDirection: string;
  transitionDirection: string;
  confidence: number;
  riskFlags: string[];
};

const RUNNING_JOB_TIMEOUT_MS = 30 * 60_000;

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function fallbackPlan(input: {
  durationMs: number;
  targetDurationMs: number;
  purpose: string;
  visualStyle: string;
  captionStyle: string;
  musicStyle: string;
  colorGrade: string;
}): AutomatedEditPlan {
  const usableDuration = Math.min(input.durationMs, input.targetDurationMs);
  return {
    narrative: `A concise ${input.purpose} production using the confirmed customer brief.`,
    hook: "Open with the strongest usable moment from the supplied footage.",
    segments: [
      {
        sourceStartMs: 0,
        sourceEndMs: usableDuration,
        purpose: "primary story",
        treatment: `${input.visualStyle} pacing with technically safe cuts`,
      },
    ],
    captionDirection: input.captionStyle,
    musicDirection: input.musicStyle,
    colorDirection: input.colorGrade,
    transitionDirection: "Use restrained cuts and short dissolves where continuity needs support.",
    confidence: 55,
    riskFlags: [
      "Automated metadata analysis cannot confirm the strongest visual moments without transcript or vision analysis.",
    ],
  };
}

function normalizePlan(
  parsed: Record<string, unknown> | null,
  fallback: AutomatedEditPlan,
  sourceDurationMs: number,
) {
  if (!parsed) return fallback;
  const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
  const segments = rawSegments
    .map((segment) => {
      if (!segment || typeof segment !== "object") return null;
      const candidate = segment as Record<string, unknown>;
      const start = clamp(Number(candidate.sourceStartMs || 0), 0, sourceDurationMs);
      const end = clamp(Number(candidate.sourceEndMs || 0), start, sourceDurationMs);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return {
        sourceStartMs: Math.round(start),
        sourceEndMs: Math.round(end),
        purpose: String(candidate.purpose || "story segment").slice(0, 300),
        treatment: String(candidate.treatment || "clean edit").slice(0, 500),
      };
    })
    .filter((segment): segment is PlannedSegment => Boolean(segment))
    .slice(0, 30);

  return {
    narrative: String(parsed.narrative || fallback.narrative).slice(0, 2_000),
    hook: String(parsed.hook || fallback.hook).slice(0, 1_000),
    segments: segments.length ? segments : fallback.segments,
    captionDirection: String(
      parsed.captionDirection || fallback.captionDirection,
    ).slice(0, 1_000),
    musicDirection: String(
      parsed.musicDirection || fallback.musicDirection,
    ).slice(0, 1_000),
    colorDirection: String(
      parsed.colorDirection || fallback.colorDirection,
    ).slice(0, 1_000),
    transitionDirection: String(
      parsed.transitionDirection || fallback.transitionDirection,
    ).slice(0, 1_000),
    confidence: clamp(Number(parsed.confidence || fallback.confidence), 0, 100),
    riskFlags: Array.isArray(parsed.riskFlags)
      ? parsed.riskFlags.map(String).slice(0, 20)
      : fallback.riskFlags,
  };
}

async function createAutomatedPlan(input: {
  orderId: string;
  sourceDurationMs: number;
  targetDurationMs: number;
  purpose: string;
  audience: string;
  visualStyle: string;
  mood: string;
  editingPace: string;
  colorGrade: string;
  captionStyle: string;
  musicStyle: string;
  platform: string;
  aspectRatio: string;
  resolution: string;
  prompt: string;
  mandatoryContent: string;
  excludedContent: string;
}) {
  const fallback = fallbackPlan({
    durationMs: input.sourceDurationMs,
    targetDurationMs: input.targetDurationMs,
    purpose: input.purpose,
    visualStyle: input.visualStyle,
    captionStyle: input.captionStyle,
    musicStyle: input.musicStyle,
    colorGrade: input.colorGrade,
  });

  const prompt = `Create a conservative machine-readable edit plan for an automated video production.

You have the customer brief and technical metadata, but not a transcript or visual frames. Never claim that you saw a person, object, scene, spoken sentence, or emotional moment. Use time ranges only as a safe structural plan. Keep all ranges inside the source duration.

Source duration: ${input.sourceDurationMs} ms
Target duration: ${input.targetDurationMs} ms
Purpose: ${input.purpose}
Audience: ${input.audience}
Style: ${input.visualStyle}
Mood: ${input.mood}
Pace: ${input.editingPace}
Color: ${input.colorGrade}
Captions: ${input.captionStyle}
Music: ${input.musicStyle}
Platform: ${input.platform}
Output: ${input.aspectRatio}, ${input.resolution}
Mandatory content: ${input.mandatoryContent}
Excluded content: ${input.excludedContent}
Customer instructions: ${input.prompt}

Return only JSON:
{
  "narrative": "string",
  "hook": "string",
  "segments": [
    {
      "sourceStartMs": 0,
      "sourceEndMs": 10000,
      "purpose": "string",
      "treatment": "string"
    }
  ],
  "captionDirection": "string",
  "musicDirection": "string",
  "colorDirection": "string",
  "transitionDirection": "string",
  "confidence": 0,
  "riskFlags": ["string"]
}`;

  try {
    const text = await callClaude(prompt, {
      orderId: input.orderId,
      purpose: "automated_edit_plan",
      usePremium: false,
      systemPrompt:
        "You create deterministic JSON edit plans and state uncertainty honestly.",
    });
    return normalizePlan(extractJsonObject(text), fallback, input.sourceDurationMs);
  } catch (error) {
    console.error("[production] AI edit planning failed; using safe plan", error);
    return fallback;
  }
}

async function processMediaAnalysisJob(jobId: string) {
  const claimed = await prisma.queueJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: "pending" },
        {
          status: "running",
          startedAt: { lt: new Date(Date.now() - RUNNING_JOB_TIMEOUT_MS) },
        },
      ],
    },
    data: {
      status: "running",
      startedAt: new Date(),
      attempts: { increment: 1 },
      error: null,
    },
  });
  if (!claimed.count) return;

  const job = await prisma.queueJob.findUnique({
    where: { id: jobId },
    include: {
      order: {
        include: {
          uploadedAssets: {
            where: { status: "VERIFIED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          editBriefs: { orderBy: { version: "desc" }, take: 1 },
          renders: {
            where: { renderType: "draft" },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!job) return;

  try {
    if (job.jobType !== "MEDIA_ANALYSIS")
      throw new Error(`Unsupported production job type: ${job.jobType}`);
    const order = job.order;
    const asset = order.uploadedAssets[0];
    if (!asset?.durationMs)
      throw new Error("Paid production has no verified source footage");
    if (!["ANALYSIS_QUEUED", "ANALYZING", "PLANNING", "QUEUED"].includes(order.status))
      throw new Error(`Order cannot enter analysis from ${order.status}`);

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "ANALYZING" },
    });

    const sourceManifest = {
      schemaVersion: "media-analysis.v1",
      assetId: asset.id,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.fileSizeBytes?.toString() || null,
      durationMs: asset.durationMs,
      checksumSha256: asset.checksumSha256,
      verifiedAt: asset.verifiedAt?.toISOString() || null,
      analysisScope: [
        "container metadata",
        "duration and integrity",
        "customer brief constraints",
      ],
      limitations: [
        "Transcript, speaker, object, face, and shot-level vision analysis are not available in this worker version.",
      ],
    };
    await prisma.mediaAnalysis.upsert({
      where: { assetId: asset.id },
      create: {
        orderId: order.id,
        assetId: asset.id,
        status: "completed",
        manifest: sourceManifest,
        confidence: 70,
        issues: sourceManifest.limitations,
        modelVersion: "metadata-v1",
        completedAt: new Date(),
      },
      update: {
        status: "completed",
        manifest: sourceManifest,
        confidence: 70,
        issues: sourceManifest.limitations,
        modelVersion: "metadata-v1",
        completedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PLANNING" },
    });

    const sourceLanguage = order.customerPromptLanguage || "en";
    const originalPrompt = order.customerPromptOriginal || "";
    const promptEn =
      sourceLanguage === "en"
        ? originalPrompt
        : await translateToEnglish(originalPrompt, sourceLanguage, order.id);
    const targetDurationMs = Math.min(
      asset.durationMs,
      Math.max(1, order.targetDurationSeconds || 60) * 1_000,
    );
    const plan = await createAutomatedPlan({
      orderId: order.id,
      sourceDurationMs: asset.durationMs,
      targetDurationMs,
      purpose: order.purpose || "general video",
      audience: order.audience || "general audience",
      visualStyle: order.visualStyle || "cinematic",
      mood: order.mood || "balanced",
      editingPace: order.editingPace || "balanced",
      colorGrade: order.colorGrade || "natural",
      captionStyle: order.captionStyle || "minimal",
      musicStyle: order.musicStyle || "cinematic",
      platform: order.platform || "web",
      aspectRatio: order.aspectRatio || "16:9",
      resolution: order.resolution,
      prompt: promptEn,
      mandatoryContent: order.mandatoryContent || "none specified",
      excludedContent: order.excludedContent || "none specified",
    });

    const existingPlan = await prisma.editPlan.findUnique({
      where: { orderId_version: { orderId: order.id, version: 1 } },
    });
    const editPlan = existingPlan
      ? await prisma.editPlan.update({
          where: { id: existingPlan.id },
          data: {
            status: "approved",
            plan: plan as unknown as Prisma.InputJsonValue,
            confidence: plan.confidence,
            riskFlags: plan.riskFlags,
            modelVersion: "automated-plan-v1",
            approvedAt: new Date(),
          },
        })
      : await prisma.editPlan.create({
          data: {
            orderId: order.id,
            version: 1,
            status: "approved",
            plan: plan as unknown as Prisma.InputJsonValue,
            confidence: plan.confidence,
            riskFlags: plan.riskFlags,
            modelVersion: "automated-plan-v1",
            approvedAt: new Date(),
          },
        });

    const timeline = {
      schemaVersion: "azyume.timeline.v1",
      orderId: order.id,
      assetId: asset.id,
      targetDurationMs,
      output: {
        aspectRatio: order.aspectRatio,
        resolution: order.resolution,
        frameRate: order.frameRate,
        format: order.exportFormat,
      },
      creative: {
        style: order.visualStyle,
        mood: order.mood,
        pace: order.editingPace,
        colorGrade: order.colorGrade,
        captions: order.captionStyle,
        music: order.musicStyle,
      },
      plan,
    };
    const timelineChecksum = sha256(
      JSON.stringify({ orderId: order.id, version: 1, timeline }),
    );
    await prisma.timelineManifest.upsert({
      where: { editPlanId: editPlan.id },
      create: {
        orderId: order.id,
        editPlanId: editPlan.id,
        schemaVersion: "azyume.timeline.v1",
        manifest: timeline as unknown as Prisma.InputJsonValue,
        checksum: timelineChecksum,
      },
      update: {
        schemaVersion: "azyume.timeline.v1",
        manifest: timeline as unknown as Prisma.InputJsonValue,
        checksum: timelineChecksum,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerPromptLanguage: sourceLanguage,
        customerPromptEn: promptEn,
        manualReviewRequired: plan.confidence < 60 || plan.riskFlags.length > 2,
      },
    });

    const renderKey = `project:${order.id}:draft:${order.revisionCount + 1}`;
    const priorRender = await prisma.render.findUnique({
      where: { idempotencyKey: renderKey },
    });
    const render =
      priorRender ||
      (await prisma.render.create({
        data: {
          orderId: order.id,
          renderType: "draft",
          status: "QUEUED",
          idempotencyKey: renderKey,
          reservedCredits: 0,
          outputR2Key: R2Keys.draft(order.id, order.revisionCount + 1),
        },
      }));

    if (!["SUCCEEDED", "RENDERING", "UPLOADING"].includes(render.status)) {
      await getRenderQueue().add(
        "render-video",
        { orderId: order.id, renderId: render.id, billingMode: "project" },
        { jobId: render.id },
      );
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: render.status === "SUCCEEDED" ? "DRAFT_REVIEW" : "QUEUED",
          estimatedCredits: 0,
        },
      }),
      prisma.queueJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date() },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 2_000) : "Production failed";
    const exhausted = job.attempts >= job.maxAttempts;
    await prisma.$transaction([
      prisma.queueJob.update({
        where: { id: job.id },
        data: {
          status: exhausted ? "failed" : "pending",
          error: message,
          startedAt: null,
        },
      }),
      prisma.order.update({
        where: { id: job.orderId },
        data: {
          status: exhausted ? "PRODUCTION_FAILED" : "ANALYSIS_QUEUED",
          manualReviewRequired: exhausted,
        },
      }),
    ]);
    if (exhausted) {
      await prisma.reviewTask.create({
        data: {
          orderId: job.orderId,
          reason: `Production pipeline failed: ${message}`,
          riskScore: 90,
        },
      });
    }
    throw error;
  }
}

let productionDispatchRunning = false;

export async function dispatchPendingProductionJobs() {
  if (productionDispatchRunning) return;
  productionDispatchRunning = true;
  try {
    const jobs = await prisma.queueJob.findMany({
      where: {
        jobType: "MEDIA_ANALYSIS",
        OR: [
          { status: "pending" },
          {
            status: "running",
            startedAt: { lt: new Date(Date.now() - RUNNING_JOB_TIMEOUT_MS) },
          },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 3,
    });
    for (const job of jobs) {
      await processMediaAnalysisJob(job.id).catch((error) =>
        console.error(`[production] Job ${job.id} failed`, error),
      );
    }
  } finally {
    productionDispatchRunning = false;
  }
}
