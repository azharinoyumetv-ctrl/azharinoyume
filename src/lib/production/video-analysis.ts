import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { downloadR2ObjectToFile } from "@/lib/storage/r2";

const SceneSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  description: z.string().min(1).max(1_000),
  spokenText: z.string().max(2_000).optional().default(""),
  qualityScore: z.number().min(0).max(100),
  energy: z.enum(["low", "medium", "high"]),
});

export const VideoAnalysisManifestSchema = z.object({
  summary: z.string().min(1).max(4_000),
  scenes: z.array(SceneSchema).min(1).max(300),
  speakers: z.array(z.string().max(200)).max(50).default([]),
  transcriptLanguage: z.string().max(50).default("unknown"),
  highlights: z.array(z.object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().positive(),
    reason: z.string().min(1).max(500),
  })).max(100).default([]),
  qualityIssues: z.array(z.object({
    startMs: z.number().int().min(0),
    endMs: z.number().int().positive(),
    issue: z.string().min(1).max(500),
    severity: z.enum(["low", "medium", "high"]),
  })).max(100).default([]),
  detectedObjects: z.array(z.string().max(200)).max(100).default([]),
  audioProfile: z.object({
    hasSpeech: z.boolean(),
    hasMusic: z.boolean(),
    noiseLevel: z.enum(["low", "medium", "high"]),
  }),
  confidence: z.number().min(0).max(100),
});

export type VideoAnalysisManifest = z.infer<typeof VideoAnalysisManifestSchema>;

function extractJson(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Video analysis did not return JSON");
  return JSON.parse(match[0]) as unknown;
}

function safeExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();
  if ([".mp4", ".mov", ".mpeg", ".mpg", ".avi", ".webm", ".wmv", ".3gp"].includes(extension))
    return extension;
  if (mimeType === "video/quicktime") return ".mov";
  if (mimeType === "video/webm") return ".webm";
  return ".mp4";
}

function validateTimeRanges(manifest: VideoAnalysisManifest, durationMs: number) {
  const ranges = [
    ...manifest.scenes.map((scene) => ({ startMs: scene.startMs, endMs: scene.endMs })),
    ...manifest.highlights,
    ...manifest.qualityIssues,
  ];
  if (ranges.some((range) => range.endMs <= range.startMs || range.endMs > durationMs))
    throw new Error("Video analysis returned an invalid timestamp range");
}

export async function analyzeVideoAsset(input: {
  orderId: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  durationMs: number;
  customerBrief: string;
  mandatoryContent: string;
  excludedContent: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for video understanding");
  const model = process.env.GEMINI_VIDEO_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "azyume-analysis-"));
  const localPath = path.join(tempDirectory, `source${safeExtension(input.fileName, input.mimeType)}`);
  const ai = new GoogleGenAI({ apiKey });
  let remoteFileName: string | undefined;
  try {
    await downloadR2ObjectToFile(input.r2Key, localPath);
    const uploaded = await ai.files.upload({
      file: localPath,
      config: { mimeType: input.mimeType, displayName: `Azyume ${input.orderId}` },
    });
    if (!uploaded.name) throw new Error("Gemini did not return an uploaded file name");
    remoteFileName = uploaded.name;
    let file = await ai.files.get({ name: uploaded.name });
    const deadline = Date.now() + 30 * 60_000;
    while (file.state === "PROCESSING" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      file = await ai.files.get({ name: uploaded.name });
    }
    if (file.state !== "ACTIVE" || !file.uri || !file.mimeType)
      throw new Error(`Gemini video processing did not become active (${file.state || "unknown"})`);

    const prompt = `Analyze this customer-supplied video for a professional automated edit.

Customer brief: ${input.customerBrief}
Mandatory content: ${input.mandatoryContent}
Excluded content: ${input.excludedContent}
Source duration: ${input.durationMs} ms

Return only JSON. Use exact millisecond timestamps grounded in the video. Describe visible events and spoken content without inventing details. Divide the full source into useful scenes. Flag blurry, silent, shaky, duplicated, corrupted, private, or otherwise risky moments. Identify strong hooks and highlights relevant to the customer brief.

Schema:
{"summary":"string","scenes":[{"startMs":0,"endMs":1000,"description":"string","spokenText":"string","qualityScore":0,"energy":"low|medium|high"}],"speakers":["string"],"transcriptLanguage":"string","highlights":[{"startMs":0,"endMs":1000,"reason":"string"}],"qualityIssues":[{"startMs":0,"endMs":1000,"issue":"string","severity":"low|medium|high"}],"detectedObjects":["string"],"audioProfile":{"hasSpeech":true,"hasMusic":false,"noiseLevel":"low|medium|high"},"confidence":0}`;
    const response = await ai.models.generateContent({
      model,
      contents: createUserContent([
        createPartFromUri(file.uri, file.mimeType),
        prompt,
      ]),
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 16_384,
      },
    });
    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty video analysis");
    const manifest = VideoAnalysisManifestSchema.parse(extractJson(text));
    validateTimeRanges(manifest, input.durationMs);

    const inputTokens = Number(response.usageMetadata?.promptTokenCount || 0);
    const outputTokens = Number(response.usageMetadata?.candidatesTokenCount || 0);
    const inputRate = Number(process.env.GEMINI_VIDEO_INPUT_USD_PER_MILLION_TOKENS || 0.3);
    const outputRate = Number(process.env.GEMINI_VIDEO_OUTPUT_USD_PER_MILLION_TOKENS || 2.5);
    const costUsd = (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
    await prisma.$transaction([
      prisma.aiUsageLog.create({
        data: {
          orderId: input.orderId,
          model,
          purpose: "video_understanding",
          provider: "gemini",
          promptVersion: "video-analysis-v1",
          inputTokens,
          outputTokens,
          costUsd,
        },
      }),
      prisma.costLog.create({
        data: {
          orderId: input.orderId,
          costType: "ai_video_analysis",
          amount: costUsd,
          description: `Gemini video understanding (${model})`,
        },
      }),
    ]);
    return { manifest, model };
  } finally {
    if (remoteFileName) await ai.files.delete({ name: remoteFileName }).catch(() => undefined);
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
