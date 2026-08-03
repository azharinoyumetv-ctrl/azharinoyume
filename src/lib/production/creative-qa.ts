import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { downloadR2ObjectToFile } from "@/lib/storage/r2";

const CreativeQaSchema = z.object({
  overallScore: z.number().min(0).max(100),
  briefAdherenceScore: z.number().min(0).max(100),
  mandatoryContentScore: z.number().min(0).max(100),
  exclusionComplianceScore: z.number().min(0).max(100),
  styleAndPacingScore: z.number().min(0).max(100),
  captionScore: z.number().min(0).max(100),
  brandScore: z.number().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(["low", "medium", "high", "critical"]),
    code: z.string().min(1).max(100),
    message: z.string().min(1).max(500),
  })).max(30),
  requiresHuman: z.boolean(),
});

export type CreativeQaResult = z.infer<typeof CreativeQaSchema>;

function extractJson(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Creative QA did not return JSON");
  return JSON.parse(match[0]) as unknown;
}

export async function reviewCreativeOutput(input: {
  orderId: string;
  r2Key: string;
  brief: Record<string, unknown>;
  timeline: Record<string, unknown>;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for creative QA");
  const model = process.env.GEMINI_VIDEO_QA_MODEL || process.env.GEMINI_VIDEO_MODEL || "gemini-2.5-flash";
  const directory = await mkdtemp(path.join(os.tmpdir(), "azyume-creative-qa-"));
  const filePath = path.join(directory, "render.mp4");
  const ai = new GoogleGenAI({ apiKey });
  let uploadedName: string | undefined;
  try {
    await downloadR2ObjectToFile(input.r2Key, filePath);
    const uploaded = await ai.files.upload({ file: filePath, config: { mimeType: "video/mp4", displayName: `Azyume QA ${input.orderId}` } });
    if (!uploaded.name) throw new Error("Creative QA upload returned no file name");
    uploadedName = uploaded.name;
    let file = await ai.files.get({ name: uploaded.name });
    const deadline = Date.now() + 20 * 60_000;
    while (file.state === "PROCESSING" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      file = await ai.files.get({ name: uploaded.name });
    }
    if (file.state !== "ACTIVE" || !file.uri || !file.mimeType)
      throw new Error(`Creative QA media did not become active (${file.state || "unknown"})`);
    const prompt = `Review this rendered customer video against its approved brief and deterministic timeline. Evaluate only observable evidence. Do not award credit for requirements that are not visible or audible. A mandatory omission, prohibited-content inclusion, unreadable captions, missing requested brand treatment, or materially wrong pacing must be reported.

Approved brief: ${JSON.stringify(input.brief)}
Timeline contract: ${JSON.stringify(input.timeline)}

Return only JSON:
{"overallScore":0,"briefAdherenceScore":0,"mandatoryContentScore":0,"exclusionComplianceScore":0,"styleAndPacingScore":0,"captionScore":0,"brandScore":0,"issues":[{"severity":"low|medium|high|critical","code":"string","message":"string"}],"requiresHuman":false}`;
    const response = await ai.models.generateContent({
      model,
      contents: createUserContent([createPartFromUri(file.uri, file.mimeType), prompt]),
      config: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 4_096 },
    });
    if (!response.text) throw new Error("Creative QA returned an empty response");
    const result = CreativeQaSchema.parse(extractJson(response.text));
    const inputTokens = Number(response.usageMetadata?.promptTokenCount || 0);
    const outputTokens = Number(response.usageMetadata?.candidatesTokenCount || 0);
    const costUsd = (inputTokens * Number(process.env.GEMINI_VIDEO_INPUT_USD_PER_MILLION_TOKENS || 0.3) + outputTokens * Number(process.env.GEMINI_VIDEO_OUTPUT_USD_PER_MILLION_TOKENS || 2.5)) / 1_000_000;
    await prisma.$transaction([
      prisma.aiUsageLog.create({ data: { orderId: input.orderId, provider: "gemini", model, purpose: "creative_qa", promptVersion: "creative-qa-v1", inputTokens, outputTokens, costUsd } }),
      prisma.costLog.create({ data: { orderId: input.orderId, costType: "creative_qa", amount: costUsd, description: `Gemini creative QA (${model})` } }),
    ]);
    return result;
  } finally {
    if (uploadedName) await ai.files.delete({ name: uploadedName }).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
}
