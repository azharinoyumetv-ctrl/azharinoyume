import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const Schema = z
  .object({
    externalId: z.string().max(300).optional(),
    connectorId: z.string().uuid().optional(),
    title: z.string().min(3).max(500),
    description: z.string().max(30_000).optional(),
    sourceUrl: z.string().url().optional(),
    source: z.string().min(2).max(100),
    industry: z.string().max(150).optional(),
    serviceFamily: z.string().max(150).optional(),
    category: z.string().max(150).optional(),
    subcategory: z.string().max(150).optional(),
    deliverables: z.array(z.string().max(500)).max(100).default([]),
    requiredSkills: z.array(z.string().max(200)).max(100).default([]),
    location: z.string().max(200).optional(),
    language: z.string().max(80).optional(),
    engagementModel: z.string().max(100).optional(),
    budgetType: z.string().max(100).optional(),
    budgetMin: z.number().nonnegative().optional(),
    budgetMax: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    deadline: z.string().max(200).optional(),
    score: z.number().min(0).max(100).optional(),
    legitimacyScore: z.number().min(0).max(100).optional(),
    capabilityScore: z.number().min(0).max(100).optional(),
    profitabilityScore: z.number().min(0).max(100).optional(),
    riskScore: z.number().min(0).max(100).optional(),
    productRoute: z.string().max(150).optional(),
    routeDecision: z.enum([
      "DIRECT_FULFILMENT",
      "CUSTOM_QUOTE",
      "PARTNER_REFERRAL",
      "PRODUCT_RESEARCH",
      "FUTURE_PRODUCT_CANDIDATE",
      "UNSUPPORTED",
      "PROHIBITED",
    ]).optional(),
    riskFlags: z.array(z.string().max(300)).max(100).default([]),
    policyStatus: z.string().max(100).default("review_required"),
    breakdown: z.record(z.unknown()).optional(),
    proposalDraft: z.string().max(30_000).optional(),
    matchedKeyword: z.string().max(200).optional(),
    rawSnapshot: z.record(z.unknown()).optional(),
  })
  .refine((value) => Boolean(value.externalId || value.sourceUrl), {
    message: "externalId or sourceUrl is required for deduplication",
  })
  .refine(
    (value) =>
      value.budgetMin == null ||
      value.budgetMax == null ||
      value.budgetMin <= value.budgetMax,
    { message: "budgetMin cannot exceed budgetMax" },
  );

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-n8n-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid canonical opportunity", issues: parsed.error.issues },
      { status: 400 },
    );

  const input = parsed.data;
  const data = {
    externalId: input.externalId,
    connectorId: input.connectorId,
    title: input.title,
    description: input.description,
    sourceUrl: input.sourceUrl,
    source: input.source,
    industry: input.industry,
    serviceFamily: input.serviceFamily,
    category: input.category,
    subcategory: input.subcategory,
    deliverables: input.deliverables,
    requiredSkills: input.requiredSkills,
    location: input.location,
    language: input.language,
    engagementModel: input.engagementModel,
    budgetType: input.budgetType,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    currency: input.currency?.toUpperCase(),
    deadline: input.deadline,
    score: input.score,
    legitimacyScore: input.legitimacyScore,
    capabilityScore: input.capabilityScore,
    profitabilityScore: input.profitabilityScore,
    riskScore: input.riskScore,
    productRoute: input.productRoute,
    routeDecision: input.routeDecision,
    riskFlags: input.riskFlags,
    policyStatus: input.policyStatus,
    scoreBreakdown: input.breakdown as Prisma.InputJsonValue | undefined,
    matchedKeyword: input.matchedKeyword,
    rawSnapshot: (input.rawSnapshot || input) as Prisma.InputJsonValue,
    pipelineStatus: "scored",
  };

  const existing = input.externalId
    ? await prisma.jobLead.findUnique({
        where: {
          source_externalId: {
            source: input.source,
            externalId: input.externalId,
          },
        },
      })
    : await prisma.jobLead.findFirst({
        where: { source: input.source, sourceUrl: input.sourceUrl },
      });

  const lead = existing
    ? await prisma.jobLead.update({ where: { id: existing.id }, data })
    : await prisma.jobLead.create({ data });

  if (input.proposalDraft) {
    const latest = await prisma.proposalDraft.findFirst({
      where: { jobLeadId: lead.id, status: "draft" },
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      await prisma.proposalDraft.update({
        where: { id: latest.id },
        data: { draftText: input.proposalDraft },
      });
    } else {
      await prisma.proposalDraft.create({
        data: {
          jobLeadId: lead.id,
          draftText: input.proposalDraft,
          aiModel:
            process.env.ANTHROPIC_MODEL_CHEAP || "claude-haiku-4-5-20251001",
          status: "draft",
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    deduplicated: Boolean(existing),
  });
}
