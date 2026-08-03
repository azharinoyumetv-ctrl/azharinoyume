import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { RenderRequest } from "./contracts";
import { render360Job } from "./render-360";
import { verifyRenderedMedia, type MediaQaResult } from "./media-qa";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const ENTRY = path.resolve(__dirname, "../src/index.ts");
const TMP = process.env.RENDER_TMP_DIR || os.tmpdir();

// Bundle cache — only rebuild when source changes
let bundleCache: string | null = null;
let bundleCacheTime = 0;

async function getBundle(): Promise<string> {
  const srcMtime = fs.statSync(ENTRY).mtimeMs;
  if (bundleCache && srcMtime <= bundleCacheTime) return bundleCache;

  console.log("[render] Bundling Remotion compositions…");
  bundleCache = await bundle({
    entryPoint: ENTRY,
    onProgress: (p) => process.stdout.write(`\r[bundle] ${p}%`),
  });
  bundleCacheTime = srcMtime;
  console.log("\n[render] Bundle ready:", bundleCache);
  return bundleCache;
}

export async function renderJob(
  job: RenderRequest,
  onProgress?: (progress: number) => void,
  onUploading?: () => void,
): Promise<{ r2Key: string; durationMs: number; checksum: string; qa: MediaQaResult }> {
  if (job.processing?.kind === "360")
    return render360Job(job, onProgress, onUploading);
  const start = Date.now();
  const tmpOut = path.join(TMP, `${job.jobId}.mp4`);

  try {
    const bundlePath = await getBundle();

    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: job.compositionId,
      inputProps: job.inputProps,
    });

    console.log(
      `[render] Starting job ${job.jobId} — composition: ${job.compositionId}, frames: ${composition.durationInFrames}`,
    );

    await renderMedia({
      serveUrl: bundlePath,
      composition: {
        ...composition,
        width: job.width,
        height: job.height,
        fps: job.fps,
        ...(job.durationInFrames
          ? { durationInFrames: job.durationInFrames }
          : {}),
      },
      codec: "h264",
      outputLocation: tmpOut,
      inputProps: job.inputProps,
      concurrency: job.concurrency,
      onProgress: ({ progress }) => {
        process.stdout.write(
          `\r[render] ${job.jobId} ${Math.round(progress * 100)}%`,
        );
        onProgress?.(Math.round(progress * 90));
      },
    });

    console.log(`\n[render] Render complete: ${job.jobId}`);

    const qa = await verifyRenderedMedia(tmpOut, {
      width: job.width,
      height: job.height,
      fps: job.fps,
      durationSeconds: job.durationInFrames ? job.durationInFrames / job.fps : undefined,
    });

    // Upload to R2
    onUploading?.();
    const fileData = fs.readFileSync(tmpOut);
    const checksum = crypto.createHash("sha256").update(fileData).digest("hex");
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: job.outputKey,
        Body: fileData,
        ContentType: "video/mp4",
      }),
    );

    console.log(`[render] Uploaded to R2: ${job.outputKey}`);
    return { r2Key: job.outputKey, durationMs: Date.now() - start, checksum, qa };
  } finally {
    try {
      fs.unlinkSync(tmpOut);
    } catch {}
  }
}
