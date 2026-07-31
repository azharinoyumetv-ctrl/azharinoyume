import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ApiError, apiError } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import { assertProductionTransition } from "@/lib/production/state-machine";

const AnalysisSchema = z.object({
  kind: z.literal("MEDIA_ANALYSIS"),
  orderId: z.string().uuid(),
  assetId: z.string().uuid(),
  manifest: z.record(z.unknown()),
  confidence: z.number().min(0).max(100).optional(),
  issues: z.array(z.unknown()).default([]),
  modelVersion: z.string().max(200).optional(),
});

const EditPlanSchema = z.object({
  kind: z.literal("EDIT_PLAN"),
  orderId: z.string().uuid(),
  version: z.number().int().positive().default(1),
  plan: z.record(z.unknown()),
  confidence: z.number().min(0).max(100).optional(),
  riskFlags: z.array(z.string().max(300)).default([]),
  modelVersion: z.string().max(200).optional(),
});

const TimelineSchema = z.object({
  kind: z.literal("TIMELINE_MANIFEST"),
  orderId: z.string().uuid(),
  editPlanId: z.string().uuid(),
  schemaVersion: z.string().min(1).max(50),
  manifest: z.record(z.unknown()),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
});

const QualityCheckSchema = z.object({
  kind: z.literal("QUALITY_CHECK"),
  orderId: z.string().uuid(),
  renderId: z.string().uuid(),
  qaType: z.enum(["draft", "final"]).default("draft"),
  status: z.enum(["passed", "failed", "manual_review"]),
  checks: z.record(z.unknown()),
  technicalScore: z.number().min(0).max(100).optional(),
  creativeScore: z.number().min(0).max(100).optional(),
  requiresHuman: z.boolean().default(false),
});

const Schema = z.discriminatedUnion("kind", [
  AnalysisSchema,
  EditPlanSchema,
  TimelineSchema,
  QualityCheckSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-n8n-secret");
    if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET)
      throw new ApiError(401, "Unauthorized");

    const input = Schema.parse(await request.json());
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.invoices[0]?.status !== "paid")
      throw new ApiError(409, "Production artifacts require a paid invoice");

    if (input.kind === "MEDIA_ANALYSIS") {
      const asset = await prisma.uploadedAsset.findFirst({
        where: {
          id: input.assetId,
          orderId: input.orderId,
          status: "VERIFIED",
        },
      });
      if (!asset) throw new ApiError(409, "A verified order asset is required");
      assertProductionTransition(order.status, "ANALYZING");
      const analysis = await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "ANALYZING" },
        });
        const artifact = await tx.mediaAnalysis.upsert({
          where: { assetId: input.assetId },
          create: {
            orderId: input.orderId,
            assetId: input.assetId,
            status: "completed",
            manifest: input.manifest as Prisma.InputJsonValue,
            confidence: input.confidence,
            issues: input.issues as Prisma.InputJsonValue,
            modelVersion: input.modelVersion,
            completedAt: new Date(),
          },
          update: {
            status: "completed",
            manifest: input.manifest as Prisma.InputJsonValue,
            confidence: input.confidence,
            issues: input.issues as Prisma.InputJsonValue,
            modelVersion: input.modelVersion,
            completedAt: new Date(),
          },
        });
        assertProductionTransition("ANALYZING", "EDIT_PLANNING");
        await tx.order.update({
          where: { id: order.id },
          data: { status: "EDIT_PLANNING" },
        });
        return artifact;
      });
      return NextResponse.json({ ok: true, artifactId: analysis.id });
    }

    if (input.kind === "EDIT_PLAN") {
      if (order.status !== "EDIT_PLANNING")
        throw new ApiError(409, "Edit plans require completed media analysis");
      const analysisCount = await prisma.mediaAnalysis.count({
        where: { orderId: order.id, status: "completed" },
      });
      if (!analysisCount)
        throw new ApiError(409, "No completed media analysis is available");
      const plan = await prisma.editPlan.upsert({
        where: {
          orderId_version: {
            orderId: input.orderId,
            version: input.version,
          },
        },
        create: {
          orderId: input.orderId,
          version: input.version,
          status: "draft",
          plan: input.plan as Prisma.InputJsonValue,
          confidence: input.confidence,
          riskFlags: input.riskFlags,
          modelVersion: input.modelVersion,
        },
        update: {
          plan: input.plan as Prisma.InputJsonValue,
          confidence: input.confidence,
          riskFlags: input.riskFlags,
          modelVersion: input.modelVersion,
        },
      });
      return NextResponse.json({ ok: true, artifactId: plan.id });
    }

    if (input.kind === "TIMELINE_MANIFEST") {
      const plan = await prisma.editPlan.findFirst({
        where: { id: input.editPlanId, orderId: input.orderId },
      });
      if (!plan) throw new ApiError(409, "Edit plan does not belong to order");
      assertProductionTransition(order.status, "DRAFT_READY_TO_RENDER");
      const timeline = await prisma.$transaction(async (tx) => {
        const artifact = await tx.timelineManifest.upsert({
          where: { editPlanId: input.editPlanId },
          create: {
            orderId: input.orderId,
            editPlanId: input.editPlanId,
            schemaVersion: input.schemaVersion,
            manifest: input.manifest as Prisma.InputJsonValue,
            checksum: input.checksum.toLowerCase(),
          },
          update: {
            schemaVersion: input.schemaVersion,
            manifest: input.manifest as Prisma.InputJsonValue,
            checksum: input.checksum.toLowerCase(),
          },
        });
        await tx.editPlan.update({
          where: { id: plan.id },
          data: { status: "approved", approvedAt: new Date() },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: "DRAFT_READY_TO_RENDER" },
        });
        return artifact;
      });
      return NextResponse.json({ ok: true, artifactId: timeline.id });
    }

    const render = await prisma.render.findFirst({
      where: { id: input.renderId, orderId: input.orderId },
    });
    if (!render) throw new ApiError(409, "Render does not belong to order");
    if (input.qaType !== "draft")
      throw new ApiError(
        409,
        "Final delivery QA must use the delivery workflow",
      );
    if (order.status === "DRAFT_RENDERING") {
      assertProductionTransition(order.status, "QUALITY_CHECK");
    } else if (order.status !== "QUALITY_CHECK") {
      throw new ApiError(409, "Draft QA requires a completed draft render");
    }

    const nextStatus =
      input.status === "passed" && !input.requiresHuman
        ? "DRAFT_REVIEW"
        : input.status === "failed"
          ? "QA_FAILED"
          : "PRODUCTION_REVIEW_REQUIRED";
    assertProductionTransition("QUALITY_CHECK", nextStatus);

    const qualityCheck = await prisma.$transaction(async (tx) => {
      const artifact = await tx.qualityCheck.upsert({
        where: { renderId: input.renderId },
        create: {
          orderId: input.orderId,
          renderId: input.renderId,
          qaType: input.qaType,
          status: input.status,
          checks: input.checks as Prisma.InputJsonValue,
          technicalScore: input.technicalScore,
          creativeScore: input.creativeScore,
          requiresHuman: input.requiresHuman,
        },
        update: {
          status: input.status,
          checks: input.checks as Prisma.InputJsonValue,
          technicalScore: input.technicalScore,
          creativeScore: input.creativeScore,
          requiresHuman: input.requiresHuman,
          completedAt: new Date(),
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          manualReviewRequired: nextStatus === "PRODUCTION_REVIEW_REQUIRED",
        },
      });
      return artifact;
    });
    return NextResponse.json({ ok: true, artifactId: qualityCheck.id });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid production artifact", issues: error.issues },
        { status: 400 },
      );
    return apiError(error);
  }
}
