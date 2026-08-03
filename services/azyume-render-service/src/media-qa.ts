import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";

type FfprobeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  duration?: string;
};

type FfprobeOutput = {
  streams?: FfprobeStream[];
  format?: { duration?: string; size?: string };
};

export type MediaQaResult = {
  checks: {
    playableVideo: boolean;
    dimensionsMatch: boolean;
    frameRateMatch: boolean;
    durationMatch: boolean;
    fileSizeValid: boolean;
  };
  width: number;
  height: number;
  frameRate: number;
  durationSeconds: number;
  fileSizeBytes: number;
  hasAudio: boolean;
};

function parseRate(value: string | undefined) {
  if (!value) return 0;
  const [numerator, denominator = 1] = value.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0;
  return numerator / denominator;
}

async function ffprobe(filePath: string): Promise<FfprobeOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-8_000); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`FFprobe failed (${code}): ${stderr}`));
      try {
        resolve(JSON.parse(stdout) as FfprobeOutput);
      } catch {
        reject(new Error("FFprobe returned invalid JSON"));
      }
    });
  });
}

export async function verifyRenderedMedia(
  filePath: string,
  expected: { width: number; height: number; fps: number; durationSeconds?: number },
): Promise<MediaQaResult> {
  const [probe, stats] = await Promise.all([ffprobe(filePath), fs.stat(filePath)]);
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const width = Number(video?.width || 0);
  const height = Number(video?.height || 0);
  const frameRate = parseRate(video?.avg_frame_rate || video?.r_frame_rate);
  const durationSeconds = Number(video?.duration || probe.format?.duration || 0);
  const durationTolerance = expected.durationSeconds
    ? Math.max(1.5, expected.durationSeconds * 0.03)
    : 0;
  const result: MediaQaResult = {
    checks: {
      playableVideo: Boolean(video && width > 0 && height > 0 && durationSeconds > 0),
      dimensionsMatch: width === expected.width && height === expected.height,
      frameRateMatch: frameRate > 0 && Math.abs(frameRate - expected.fps) <= 0.5,
      durationMatch: expected.durationSeconds
        ? Math.abs(durationSeconds - expected.durationSeconds) <= durationTolerance
        : durationSeconds > 0,
      fileSizeValid: stats.size >= 50_000,
    },
    width,
    height,
    frameRate,
    durationSeconds,
    fileSizeBytes: stats.size,
    hasAudio: Boolean(probe.streams?.some((stream) => stream.codec_type === "audio")),
  };
  const failed = Object.entries(result.checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length) throw new Error(`Rendered media failed technical QA: ${failed.join(", ")}`);
  return result;
}
