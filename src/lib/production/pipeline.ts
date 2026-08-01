import { Prisma } from "@/generated/prisma/client";
import { callClaude, translateToEnglish } from "@/lib/ai/claude";
import { prisma } from "@/lib/prisma";
import { getRenderQueue } from "@/lib/queue/queues";
import { R2Keys } from "@/lib/storage/r2";
import { sha256 } from "@/lib/security/crypto";
import { z } from "zod";
import {
  analyzeVideoAsset,
  type VideoAnalysisManifest,
} from "@/lib/production/video-analysis";

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

type TimelineCaption = {
  startMs: number;
  endMs: number;
  text: string;
};

const AutomatedEditPlanSchema = z.object({
  narrative: z.string().min(1).max(2_000),
  hook: z.string().min(1).max(1_000),
  segments: z.array(z.object({
    sourceStartMs: z.number().int().min(0),
    sourceEndMs: z.number().int().positive(),
    purpose: z.string().min(1).max(300),
    treatment: z.string().min(1).max(500),
  })).min(1).max(30),
  captionDirection: z.string().min(1).max(1_000),
  musicDirection: z.string().min(1).max(1_000),
  colorDirection: z.string().min(1).max(1_000),
  transitionDirection: z.string().min(1).max(1_000),
  confidence: z.number().min(0).max(100),
  riskFlags: z.array(z.string().max(300)).max(20),
});

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

export function validateAutomatedEditPlan(
  value: unknown,
  sourceDurationMs: number,
  targetDurationMs: number,
): AutomatedEditPlan {
  const plan = AutomatedEditPlanSchema.parse(value);
  for (const segment of plan.segments) {
    if (segment.sourceEndMs <= segment.sourceStartMs || segment.sourceEndMs > sourceDurationMs)
      throw new Error("Edit plan contains an invalid source range");
  }
  const plannedDuration = plan.segments.reduce(
    (total, segment) => total + segment.sourceEndMs - segment.sourceStartMs,
    0,
  );
  if (plannedDuration <= 0 || plannedDuration > targetDurationMs * 1.1)
    throw new Error("Edit plan duration exceeds the confirmed output duration");
  return plan;
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
  analysis: VideoAnalysisManifest;
}) {
  const prompt = `Create a machine-readable edit plan for an automated video production using the grounded multimodal analysis below. Select only source ranges present in the analysis. Do not invent scenes, dialogue, people, objects, or timestamps. Keep every range inside the source duration and keep the total selected duration at or below the target duration.

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
Grounded video analysis: ${JSON.stringify(input.analysis)}

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

  const text = await callClaude(prompt, {
    orderId: input.orderId,
    purpose: "automated_edit_plan",
    usePremium: false,
    maxTokens: 8192,
    systemPrompt:
      "You create deterministic JSON edit plans grounded only in supplied video analysis.",
  });
  const parsed = extractJsonObject(text);
  if (!parsed) throw new Error("AI edit planning returned invalid JSON");
  return validateAutomatedEditPlan(parsed, input.sourceDurationMs, input.targetDurationMs);
}

function buildTimelineCaptions(
  segments: PlannedSegment[],
  analysis: VideoAnalysisManifest,
  captionStyle: string,
): TimelineCaption[] {
  if (captionStyle === "none") return [];

  const captions: TimelineCaption[] = [];
  let outputCursorMs = 0;
  for (const segment of segments) {
    for (const scene of analysis.scenes) {
      const overlapStart = Math.max(segment.sourceStartMs, scene.startMs);
      const overlapEnd = Math.min(segment.sourceEndMs, scene.endMs);
      const text = scene.spokenText.trim();
      if (!text || overlapEnd <= overlapStart) continue;
      captions.push({
        startMs: outputCursorMs + overlapStart - segment.sourceStartMs,
        endMs: outputCursorMs + overlapEnd - segment.sourceStartMs,
        text,
      });
    }
    outputCursorMs += segment.sourceEndMs - segment.sourceStartMs;
  }
  return captions.slice(0, 300);
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
    if (!asset?.durationMs || !asset.fileName || !asset.mimeType)
      throw new Error("Paid production has no verified source footage");
    if (!["ANALYSIS_QUEUED", "ANALYZING", "PLANNING", "QUEUED"].includes(order.status))
      throw new Error(`Order cannot enter analysis from ${order.status}`);

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "ANALYZING" },
    });

    const sourceLanguage = order.customerPromptLanguage || "en";
    const originalPrompt = order.customerPromptOriginal || "";
    const promptEn =
      sourceLanguage === "en"
        ? originalPrompt
        : await translateToEnglish(originalPrompt, sourceLanguage, order.id);
    const analyzed = await analyzeVideoAsset({
      orderId: order.id,
      r2Key: asset.r2Key,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      durationMs: asset.durationMs,
      customerBrief: promptEn,
      mandatoryContent: order.mandatoryContent || "none specified",
      excludedContent: order.excludedContent || "none specified",
    });
    const sourceManifest = {
      schemaVersion: "media-analysis.v2",
      assetId: asset.id,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.fileSizeBytes?.toString() || null,
      durationMs: asset.durationMs,
      checksumSha256: asset.checksumSha256,
      verifiedAt: asset.verifiedAt?.toISOString() || null,
      ...analyzed.manifest,
    };
    await prisma.mediaAnalysis.upsert({
      where: { assetId: asset.id },
      create: {
        orderId: order.id,
        assetId: asset.id,
        status: "completed",
        manifest: sourceManifest,
        confidence: analyzed.manifest.confidence,
        issues: analyzed.manifest.qualityIssues,
        modelVersion: analyzed.model,
        completedAt: new Date(),
      },
      update: {
        status: "completed",
        manifest: sourceManifest,
        confidence: analyzed.manifest.confidence,
        issues: analyzed.manifest.qualityIssues,
        modelVersion: analyzed.model,
        completedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PLANNING" },
    });

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
      analysis: analyzed.manifest,
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
            modelVersion: "grounded-plan-v2",
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
            modelVersion: "grounded-plan-v2",
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
      captions: buildTimelineCaptions(
        plan.segments,
        analyzed.manifest,
        order.captionStyle || "minimal",
      ),
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

    const manualReviewRequired =
      plan.confidence < 60 ||
      plan.riskFlags.length > 2 ||
      (order.musicStyle || "none") !== "none";
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerPromptLanguage: sourceLanguage,
        customerPromptEn: promptEn,
        manualReviewRequired,
        adminApproved: !manualReviewRequired,
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
