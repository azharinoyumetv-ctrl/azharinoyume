import fs from "node:fs";
import path from "node:path";
import type { RenderJobState } from "./contracts";

const directory = process.env.RENDER_JOB_STATE_DIR || path.resolve(process.cwd(), ".render-jobs");
function ensureDirectory() { fs.mkdirSync(directory, { recursive: true }); }
function jobPath(jobId: string) { return path.join(directory, `${jobId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`); }

export function readJob(jobId: string): RenderJobState | null {
  ensureDirectory();
  try { return JSON.parse(fs.readFileSync(jobPath(jobId), "utf8")) as RenderJobState; } catch { return null; }
}
export function writeJob(state: RenderJobState) {
  ensureDirectory();
  const target = jobPath(state.jobId); const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2)); fs.renameSync(temporary, target); return state;
}
export function updateJob(jobId: string, patch: Partial<RenderJobState>) {
  const current = readJob(jobId); if (!current) throw new Error(`Render job ${jobId} does not exist`);
  return writeJob({ ...current, ...patch, updatedAt: new Date().toISOString() });
}
export function failInterruptedJobs() {
  ensureDirectory();
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".json"))) {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")) as RenderJobState;
      if (["QUEUED", "RENDERING", "UPLOADING"].includes(state.status)) writeJob({ ...state, status: "FAILED", errorCode: "SERVICE_RESTARTED", error: "Render service restarted before the attempt completed", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } catch {}
  }
}
export function jobCounts() {
  ensureDirectory(); const counts: Record<string, number> = {};
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".json"))) {
    try { const state = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")) as RenderJobState; counts[state.status] = (counts[state.status] || 0) + 1; } catch {}
  }
  return counts;
}
