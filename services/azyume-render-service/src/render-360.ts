import { createHash } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { RenderRequest } from "./contracts";
import { verifyRenderedMedia } from "./media-qa";

type Processing360 = Extract<NonNullable<RenderRequest["processing"]>, { kind: "360" }>;
type Camera = Processing360["keyframes"][number];

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const TMP = process.env.RENDER_TMP_DIR || os.tmpdir();

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolateAngle(start: number, end: number, amount: number) {
  const delta = ((end - start + 540) % 360) - 180;
  return start + delta * amount;
}

export function cameraAt(keyframes: Camera[], timeMs: number): Camera {
  if (timeMs <= keyframes[0].timeMs) return { ...keyframes[0], timeMs };
  const last = keyframes[keyframes.length - 1];
  if (timeMs >= last.timeMs) return { ...last, timeMs };
  const nextIndex = keyframes.findIndex((frame) => frame.timeMs >= timeMs);
  const previous = keyframes[nextIndex - 1];
  const next = keyframes[nextIndex];
  const amount = (timeMs - previous.timeMs) / (next.timeMs - previous.timeMs);
  return {
    timeMs,
    yaw: interpolateAngle(previous.yaw, next.yaw, amount),
    pitch: previous.pitch + (next.pitch - previous.pitch) * amount,
    roll: interpolateAngle(previous.roll, next.roll, amount),
    fov: previous.fov + (next.fov - previous.fov) * amount,
  };
}

export function buildCameraCommands(keyframes: Camera[], durationMs: number) {
  if (keyframes.length <= 1) return "";
  const intervalMs = Math.max(100, Math.ceil(durationMs / 6000));
  const lines: string[] = [];
  for (let timeMs = 0; timeMs <= durationMs; timeMs += intervalMs) {
    const camera = cameraAt(keyframes, timeMs);
    const timestamp = (timeMs / 1000).toFixed(3);
    lines.push(
      `${timestamp} v360@view yaw ${clamp(camera.yaw, -180, 180).toFixed(3)};`,
    );
    lines.push(
      `${timestamp} v360@view pitch ${clamp(camera.pitch, -90, 90).toFixed(3)};`,
    );
    lines.push(
      `${timestamp} v360@view roll ${clamp(camera.roll, -180, 180).toFixed(3)};`,
    );
    lines.push(
      `${timestamp} v360@view h_fov ${clamp(camera.fov, 35, 140).toFixed(3)};`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function buildV360Filter(
  processing: Processing360,
  width: number,
  height: number,
  commandFile?: string,
) {
  const first = processing.keyframes[0];
  const input =
    processing.sourceProjection === "dual_fisheye" ? "dfisheye" : "equirect";
  const stereo =
    processing.stereoMode === "top_bottom"
      ? "tb"
      : processing.stereoMode === "side_by_side"
        ? "sbs"
        : "2d";
  const v360 = [
    `v360@view=input=${input}`,
    "output=flat",
    `in_stereo=${stereo}`,
    `w=${width}`,
    `h=${height}`,
    `yaw=${first.yaw}`,
    `pitch=${first.pitch}`,
    `roll=${first.roll}`,
    `h_fov=${first.fov}`,
    "interp=lanczos",
  ].join(":");
  return `${commandFile ? `sendcmd=f=${commandFile},` : ""}${v360}`;
}

async function runFfmpeg(
  args: string[],
  durationMs: number,
  onProgress?: (progress: number) => void,
) {
  await new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let output = "";
    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (chunk: string) => {
      output = `${output}${chunk}`.slice(-12_000);
      const matches = [...chunk.matchAll(/out_time_(?:ms|us)=(\d+)/g)];
      const latest = matches.at(-1);
      if (latest)
        onProgress?.(
          clamp(
            Math.round((Number(latest[1]) / (durationMs * 1000)) * 90),
            1,
            90,
          ),
        );
    });
    process.on("error", reject);
    process.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`FFmpeg 360 render failed (${code}): ${output}`)),
    );
  });
}

async function sha256(filePath: string) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export async function render360Job(
  job: RenderRequest,
  onProgress?: (progress: number) => void,
  onUploading?: () => void,
) {
  if (job.processing?.kind !== "360")
    throw new Error("360 processing settings are required");
  const processing = job.processing;
  const startedAt = Date.now();
  const outputPath = path.join(TMP, `${job.jobId}-360.mp4`);
  const commandPath = path.join(TMP, `${job.jobId}-360.commands`);
  const commands = buildCameraCommands(
    processing.keyframes,
    processing.sourceDurationMs,
  );

  try {
    if (commands)
      await fs.writeFile(commandPath, commands, {
        encoding: "utf8",
        mode: 0o600,
      });
    const filter = buildV360Filter(
      processing,
      job.width,
      job.height,
      commands ? commandPath : undefined,
    );
    await runFfmpeg(
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-progress",
        "pipe:2",
        "-nostats",
        "-i",
        processing.sourceUrl,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        `${filter},fps=${job.fps},format=yuv420p`,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        "-y",
        outputPath,
      ],
      processing.sourceDurationMs,
      onProgress,
    );

    const qa = await verifyRenderedMedia(outputPath, {
      width: job.width,
      height: job.height,
      fps: job.fps,
      durationSeconds: processing.sourceDurationMs / 1_000,
    });
    const stats = await fs.stat(outputPath);
    onUploading?.();
    const checksum = await sha256(outputPath);
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: job.outputKey,
        Body: createReadStream(outputPath),
        ContentLength: stats.size,
        ContentType: "video/mp4",
      }),
    );
    return {
      r2Key: job.outputKey,
      durationMs: Date.now() - startedAt,
      checksum,
      qa,
    };
  } finally {
    await Promise.allSettled([fs.unlink(outputPath), fs.unlink(commandPath)]);
  }
}
