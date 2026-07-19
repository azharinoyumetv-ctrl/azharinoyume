import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

const execFileAsync = promisify(execFile);

export async function probeVideo(key: string) {
  const url = await getSignedDownloadUrl(key, 15 * 60);
  const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-show_entries", "format=duration,format_name:stream=codec_type,codec_name,width,height", "-of", "json", url], { timeout: 60_000, maxBuffer: 1024 * 1024 });
  const result = JSON.parse(stdout) as { format?: { duration?: string; format_name?: string }; streams?: Array<{ codec_type?: string }> };
  const duration = Number(result.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || !result.streams?.some((stream) => stream.codec_type === "video")) throw new Error("Uploaded file is not a valid video");
  return { durationMs: Math.ceil(duration * 1000), metadata: result };
}
