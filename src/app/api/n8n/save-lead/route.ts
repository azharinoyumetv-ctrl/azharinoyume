import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, sourceUrl, source, score, breakdown, proposalDraft, budgetMin, budgetMax, currency } = await req.json();

  const lead = await prisma.jobLead.create({
    data: {
      title,
      description,
      sourceUrl,
      source: source || "rss",
      budgetMin: budgetMin ?? null,
      budgetMax: budgetMax ?? null,
      currency: currency ?? null,
      score,
      scoreBreakdown: breakdown,
      pipelineStatus: "scored",
    },
  });

  if (proposalDraft) {
    await prisma.proposalDraft.create({
      data: {
        jobLeadId: lead.id,
        draftText: proposalDraft,
        aiModel: process.env.ANTHROPIC_MODEL_CHEAP || "claude-haiku-4-5-20251001",
        status: "draft",
      },
    });
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}
