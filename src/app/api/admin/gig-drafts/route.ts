import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { generateAIText } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ platform: z.enum(["fiverr", "upwork", "freelancer"]), brief: z.string().min(20).max(5000) });
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(); const input = Schema.parse(await request.json());
    const result = await generateAIText({ maxTokens: 1400, prompt: `Draft a truthful seller gig listing for ${input.platform}. Use only the capability in this brief and do not invent customers, awards, or portfolio claims. Return JSON with title, description, pricing (three named tiers with deliverables), tags (array), and faq (array of question/answer objects). Brief:\n${input.brief}` });
    const match = result.text.match(/\{[\s\S]*\}/); if (!match) throw new Error("AI response did not contain JSON"); const draft = JSON.parse(match[0]);
    const saved = await prisma.gigDraft.create({ data: { createdById: admin.id, platform: input.platform, title: String(draft.title || "Untitled gig"), description: String(draft.description || ""), pricing: draft.pricing || {}, tags: draft.tags || [], faq: draft.faq || [], aiProvider: result.provider, aiModel: result.model, promptVersion: "gig-v1" } });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid gig brief" }, { status: 400 }); return apiError(error); }
}
