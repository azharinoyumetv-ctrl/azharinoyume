import { GoogleGenAI } from "@google/genai";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/storage/r2";
import { requireCostHeadroom } from "@/lib/accounting/cost-control";

const MusicTrackSchema = z.object({
  id: z.string().min(1),
  style: z.string().min(1),
  r2Key: z.string().min(1),
  licenseId: z.string().min(1),
  volume: z.number().min(0).max(1).default(0.14),
});

const StockBrollSchema = z.object({
  id: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  r2Key: z.string().min(1),
  licenseId: z.string().min(1),
});

export type MusicTrack = z.infer<typeof MusicTrackSchema>;
export type StockBroll = z.infer<typeof StockBrollSchema>;

function parseLibrary<T>(raw: string | undefined, schema: z.ZodType<T[]>): T[] {
  if (!raw?.trim()) return [];
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    throw new Error(`Production media library configuration is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function musicLibrary() {
  return parseLibrary(process.env.AZYUME_MUSIC_LIBRARY_JSON, z.array(MusicTrackSchema));
}

export function stockBrollLibrary() {
  return parseLibrary(process.env.AZYUME_BROLL_LIBRARY_JSON, z.array(StockBrollSchema));
}

export function selectMusicTrack(style: string) {
  const tracks = musicLibrary();
  return tracks.find((track) => track.style === style) || tracks.find((track) => track.style === "default") || null;
}

export function selectStockBroll(tags: string[]) {
  const requested = new Set(tags.map((tag) => tag.toLowerCase()));
  return stockBrollLibrary().find((asset) => asset.tags.some((tag) => requested.has(tag.toLowerCase()))) || null;
}

function supportedDuration(seconds: number) {
  if (seconds <= 4) return 4;
  if (seconds <= 6) return 6;
  return 8;
}

export async function generatePremiumBroll(input: {
  orderId: string;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  index: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for generated B-roll");
  const model = process.env.GEMINI_VIDEO_GENERATION_MODEL || "veo-3.1-fast-generate-preview";
  const durationSeconds = supportedDuration(input.durationSeconds);
  const estimatedCost = durationSeconds * Number(process.env.VEO_USD_PER_SECOND || 0.12);
  await requireCostHeadroom({
    orderId: input.orderId,
    upcomingCostUsd: estimatedCost,
    operation: `${durationSeconds}s generated B-roll`,
  });
  const ai = new GoogleGenAI({ apiKey });
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "azyume-broll-"));
  const outputPath = path.join(temporaryDirectory, `broll-${input.index}.mp4`);
  try {
    let operation = await ai.models.generateVideos({
      model,
      source: { prompt: input.prompt },
      config: {
        numberOfVideos: 1,
        durationSeconds,
        aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9",
        resolution: "1080p",
        generateAudio: false,
        labels: { order_id: input.orderId, purpose: "premium_broll" },
      },
    });
    const deadline = Date.now() + 20 * 60_000;
    while (!operation.done && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      operation = await ai.operations.getVideosOperation({ operation });
    }
    if (!operation.done) throw new Error("Generated B-roll timed out");
    if (operation.error) throw new Error(`Generated B-roll failed: ${JSON.stringify(operation.error)}`);
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) throw new Error("Video generation returned no B-roll asset");
    await ai.files.download({ file: video, downloadPath: outputPath });
    const bytes = await readFile(outputPath);
    if (bytes.length < 50_000) throw new Error("Generated B-roll output is empty");
    const r2Key = `orders/${input.orderId}/generated/broll_${input.index}.mp4`;
    await uploadToR2(r2Key, bytes, "video/mp4");
    await prisma.$transaction([
      prisma.aiUsageLog.create({
        data: { orderId: input.orderId, provider: "google", model, purpose: "generated_broll", promptVersion: "broll-v1", inputTokens: 0, outputTokens: 0, costUsd: estimatedCost },
      }),
      prisma.costLog.create({
        data: { orderId: input.orderId, costType: "generated_broll", amount: estimatedCost, description: `${durationSeconds}s generated B-roll (${model})` },
      }),
    ]);
    return { r2Key, durationMs: durationSeconds * 1_000, provider: "google", model };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
