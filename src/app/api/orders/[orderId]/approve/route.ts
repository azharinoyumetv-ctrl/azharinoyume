import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireOrderAccess } from "@/lib/api/authz";
import { getRenderQueue } from "@/lib/queue/queues";
import { PROJECT_TIERS, type ProjectTier } from "@/lib/production/catalog";
import { R2Keys } from "@/lib/storage/r2";
import { requireCostHeadroom } from "@/lib/accounting/cost-control";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
  const { orderId } = await params;
  const { order } = await requireOrderAccess(orderId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DRAFT_REVIEW") return NextResponse.json({ error: "No draft ready" }, { status: 400 });

  const tier = order.package as ProjectTier;
  if (!PROJECT_TIERS[tier]) return NextResponse.json({ error: "Unknown production tier" }, { status: 409 });
  const draftPrefix = `project:${orderId}:draft:${order.revisionCount + 1}:`;
  const drafts = await prisma.render.findMany({
    where: { orderId, renderType: "draft", status: "SUCCEEDED", idempotencyKey: { startsWith: draftPrefix } },
    include: { qualityCheck: true },
    orderBy: { createdAt: "asc" },
  });
  if (drafts.length !== PROJECT_TIERS[tier].outputVariants)
    return NextResponse.json({ error: "The complete draft deliverable set is not ready" }, { status: 409 });
  if (drafts.some((draft) => !draft.qualityCheck || !["passed", "review_required"].includes(draft.qualityCheck.status)))
    return NextResponse.json({ error: "Draft QA is incomplete" }, { status: 409 });

  const renderRate = Number(process.env.SELF_HOSTED_RENDER_USD_PER_HOUR || 0.35);
  const qaReservePerOutput = tier === "basic"
    ? 0
    : Number(process.env.CREATIVE_QA_RESERVE_USD_PER_OUTPUT || 0.08);
  const durationSeconds = Math.max(1, order.targetDurationSeconds || 60);
  await requireCostHeadroom({
    orderId,
    upcomingCostUsd: drafts.length * (
      (durationSeconds / 3_600) * renderRate + qaReservePerOutput
    ),
    operation: "approved final output render and QA",
  });

  const finalRenders = [];
  for (const draft of drafts) {
    const idempotencyKey = `project:${orderId}:final:${order.revisionCount + 1}:${draft.variantKey}`;
    const finalRender = await prisma.render.upsert({
      where: { idempotencyKey },
      create: {
        orderId,
        renderType: "final",
        variantKey: draft.variantKey,
        aspectRatio: draft.aspectRatio,
        resolution: draft.resolution,
        frameRate: draft.frameRate,
        status: "QUEUED",
        idempotencyKey,
        reservedCredits: 0,
        outputR2Key: R2Keys.final(orderId, draft.variantKey),
      },
      update: {},
    });
    finalRenders.push(finalRender);
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "FINAL_RENDERING" } });
  const queue = getRenderQueue();
  for (const render of finalRenders) {
    if (!["SUCCEEDED", "RENDERING", "UPLOADING"].includes(render.status)) {
      const existingJob = await queue.getJob(render.id);
      if (existingJob && await existingJob.isFailed()) await existingJob.retry();
      else if (!existingJob) await queue.add("render-video", { orderId, renderId: render.id, billingMode: "project" }, { jobId: render.id });
    }
  }

  return NextResponse.json({ ok: true, status: "FINAL_RENDERING", outputs: finalRenders.length });
  } catch (error) {
    return apiError(error);
  }
}
