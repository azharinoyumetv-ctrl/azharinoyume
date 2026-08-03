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
import { projectOutputVariants } from "@/lib/production/variants";
import type { ProjectTier } from "@/lib/production/catalog";
import { generatePremiumBroll, selectMusicTrack, selectStockBroll, stockBrollLibrary } from "@/lib/production/production-assets";
import { CostCapExceededError, requireCostHeadroom } from "@/lib/accounting/cost-control";

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
  bRollCues: Array<{
    outputStartMs: number;
    durationMs: number;
    prompt: string;
    tags: string[];
    source: "stock" | "generated";
  }>;
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
  bRollCues: z.array(z.object({
    outputStartMs: z.number().int().min(0),
    durationMs: z.number().int().min(1_000).max(8_000),
    prompt: z.string().min(10).max(1_000),
    tags: z.array(z.string().min(1).max(100)).min(1).max(10),
    source: z.enum(["stock", "generated"]),
  })).max(4).default([]),
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
  if (plan.bRollCues.some((cue) => cue.outputStartMs + cue.durationMs > plannedDuration))
    throw new Error("Edit plan contains B-roll outside the output timeline");
  if (plan.bRollCues.filter((cue) => cue.source === "generated").reduce((total, cue) => total + cue.durationMs, 0) > 20_000)
    throw new Error("Edit plan exceeds the generated B-roll allowance");
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
  tier: ProjectTier;
  availableBrollTags: string[];
}) {
  const bRollPolicy = input.tier === "basic"
    ? "Return an empty bRollCues array."
    : input.tier === "plus"
      ? `Request up to two useful stock B-roll cues; every cue source must be stock and every tag must come from this available licensed tag list: ${input.availableBrollTags.join(", ")}. If no listed tag is relevant, return no B-roll cue.`
      : "Request up to two useful B-roll cues. Use generated only when stock footage cannot support the brief, with no more than 20 generated seconds.";
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
B-roll policy: ${bRollPolicy}

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
  "riskFlags": ["string"],
  "bRollCues": [{"outputStartMs":0,"durationMs":4000,"prompt":"specific visual prompt","tags":["tag"],"source":"stock"}]
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

    const targetDurationMs = Math.min(
      asset.durationMs,
      Math.max(1, order.targetDurationSeconds || 60) * 1_000,
    );
    const variants = projectOutputVariants({
      tier: order.package as ProjectTier,
      aspectRatio: order.aspectRatio || "16:9",
      resolution: order.resolution,
      frameRate: order.frameRate,
    });
    const renderRate = Number(process.env.SELF_HOSTED_RENDER_USD_PER_HOUR || 0.35);
    const qaReservePerOutput = order.package === "basic"
      ? 0
      : Number(process.env.CREATIVE_QA_RESERVE_USD_PER_OUTPUT || 0.08);
    const analysisReserve = Number(process.env.VIDEO_ANALYSIS_RESERVE_USD_BASE || 0.12)
      + (asset.durationMs / 60_000) * Number(process.env.VIDEO_ANALYSIS_RESERVE_USD_PER_SOURCE_MINUTE || 0.003);
    const planningReserve = Number(process.env.EDIT_PLANNING_RESERVE_USD || 0.08);
    const premiumBrollReserve = order.package === "premium"
      ? 20 * Number(process.env.VEO_USD_PER_SECOND || 0.12)
      : 0;
    const remainingRevisionDrafts = Math.max(0, order.maxRevisions - order.revisionCount);
    const remainingOutputCycles = 2 + remainingRevisionDrafts;
    const durationSeconds = Math.max(1, Math.ceil(targetDurationMs / 1_000));
    const outputReserve = variants.length * remainingOutputCycles * (
      (durationSeconds / 3_600) * renderRate + qaReservePerOutput
    );
    await requireCostHeadroom({
      orderId: order.id,
      upcomingCostUsd: analysisReserve + planningReserve + premiumBrollReserve + outputReserve,
      operation: "complete remaining automated production allowance",
    });

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
      tier: order.package as ProjectTier,
      availableBrollTags: order.package === "basic"
        ? []
        : stockBrollLibrary().flatMap((asset) => asset.tags),
    });

    if (order.package === "basic" && plan.bRollCues.length)
      throw new Error("Basic plans cannot add B-roll cues");
    if (order.package === "plus" && plan.bRollCues.some((cue) => cue.source !== "stock"))
      throw new Error("Plus plans may use only licensed stock B-roll");

    const musicTrack = (order.musicStyle || "none") === "none"
      ? null
      : selectMusicTrack(order.musicStyle || "default");
    if ((order.musicStyle || "none") !== "none" && !musicTrack)
      throw new Error(`No licensed music track is configured for ${order.musicStyle}`);

    const resolvedBroll: Array<{
      outputStartMs: number;
      durationMs: number;
      r2Key: string;
      source: "stock" | "generated";
      licenseId?: string;
      prompt: string;
    }> = [];
    for (const [index, cue] of plan.bRollCues.entries()) {
      const stock = cue.source === "stock" ? selectStockBroll(cue.tags) : null;
      if (stock) {
        resolvedBroll.push({
          outputStartMs: cue.outputStartMs,
          durationMs: cue.durationMs,
          r2Key: stock.r2Key,
          source: "stock",
          licenseId: stock.licenseId,
          prompt: cue.prompt,
        });
        continue;
      }
      if (order.package !== "premium")
        throw new Error(`No licensed stock B-roll matched: ${cue.tags.join(", ")}`);
      const generated = await generatePremiumBroll({
        orderId: order.id,
        prompt: cue.prompt,
        aspectRatio: order.aspectRatio || "16:9",
        durationSeconds: cue.durationMs / 1_000,
        index,
      });
      resolvedBroll.push({
        outputStartMs: cue.outputStartMs,
        durationMs: Math.min(cue.durationMs, generated.durationMs),
        r2Key: generated.r2Key,
        source: "generated",
        prompt: cue.prompt,
      });
    }

    const planVersion = order.revisionCount + 1;
    const existingPlan = await prisma.editPlan.findUnique({
      where: { orderId_version: { orderId: order.id, version: planVersion } },
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
            version: planVersion,
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
        musicTrack: musicTrack ? {
          id: musicTrack.id,
          r2Key: musicTrack.r2Key,
          licenseId: musicTrack.licenseId,
          volume: musicTrack.volume,
        } : null,
        bRoll: resolvedBroll,
        brand: {
          name: order.brandName,
          primaryColor: order.brandPrimaryColor || "#d4a017",
          secondaryColor: order.brandSecondaryColor || "#ffffff",
          rules: order.brandRules,
        },
      },
      captions: buildTimelineCaptions(
        plan.segments,
        analyzed.manifest,
        order.captionStyle || "minimal",
      ),
      plan,
    };
    const timelineChecksum = sha256(
      JSON.stringify({ orderId: order.id, version: planVersion, timeline }),
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
      order.package === "premium";
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerPromptLanguage: sourceLanguage,
        customerPromptEn: promptEn,
        manualReviewRequired,
        adminApproved: !manualReviewRequired,
      },
    });

    const updatedRemainingRevisionDrafts = Math.max(0, order.maxRevisions - order.revisionCount);
    const updatedRemainingOutputCycles = 2 + updatedRemainingRevisionDrafts;
    const projectedOutputCost = variants.length * updatedRemainingOutputCycles * (
      (durationSeconds / 3_600) * renderRate + qaReservePerOutput
    );
    await requireCostHeadroom({
      orderId: order.id,
      upcomingCostUsd: projectedOutputCost,
      operation: "remaining draft, revision, final render, and creative-QA allowance",
    });
    const renders = [];
    for (const variant of variants) {
      const renderKey = `project:${order.id}:draft:${order.revisionCount + 1}:${variant.key}`;
      const priorRender = await prisma.render.findUnique({ where: { idempotencyKey: renderKey } });
      const render = priorRender || await prisma.render.create({
        data: {
          orderId: order.id,
          renderType: "draft",
          variantKey: variant.key,
          aspectRatio: variant.aspectRatio,
          resolution: variant.resolution,
          frameRate: variant.frameRate,
          status: "QUEUED",
          idempotencyKey: renderKey,
          reservedCredits: 0,
          outputR2Key: R2Keys.draft(order.id, order.revisionCount + 1, variant.key),
        },
      });
      renders.push(render);
      if (!["SUCCEEDED", "RENDERING", "UPLOADING"].includes(render.status)) {
        await getRenderQueue().add(
          "render-video",
          { orderId: order.id, renderId: render.id, billingMode: "project" },
          { jobId: render.id },
        );
      }
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: renders.every((render) => render.status === "SUCCEEDED") ? "DRAFT_REVIEW" : "QUEUED",
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
    const costBlocked = error instanceof CostCapExceededError;
    const exhausted = costBlocked || job.attempts >= job.maxAttempts;
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
          status: costBlocked
            ? "PRODUCTION_REVIEW_REQUIRED"
            : exhausted ? "PRODUCTION_FAILED" : "ANALYSIS_QUEUED",
          manualReviewRequired: exhausted,
        },
      }),
    ]);
    if (exhausted && !costBlocked) {
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
