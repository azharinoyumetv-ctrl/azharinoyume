import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { scoreJobLead } from "@/lib/ai/claude";
import { prisma } from "@/lib/prisma";
const Schema = z.object({ title: z.string().min(3), description: z.string().min(20), source: z.enum(["manual", "email", "rss", "freelancer_api"]), sourceUrl: z.string().url().optional(), matchedKeyword: z.string().max(100).optional() });
export async function POST(request: NextRequest) { try { await requireAdmin(); const input = Schema.parse(await request.json()); const scored = await scoreJobLead(input); const lead = await prisma.jobLead.create({ data: { ...input, score: scored.score, scoreBreakdown: scored.breakdown, pipelineStatus: "scored", rawSnapshot: input } }); if (scored.proposal) await prisma.proposalDraft.create({ data: { jobLeadId: lead.id, draftText: scored.proposal, aiModel: process.env.ANTHROPIC_MODEL_CHEAP || "provider-fallback", status: "draft" } }); return NextResponse.json({ id: lead.id, score: scored.score }, { status: 201 }); } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid lead" }, { status: 400 }); return apiError(error); } }
