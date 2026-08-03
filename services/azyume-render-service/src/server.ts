import "dotenv/config";
import crypto from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { RenderRequestSchema } from "./contracts";
import { failInterruptedJobs, jobCounts, readJob, updateJob, writeJob } from "./job-store";
import { renderJob } from "./render";

const app = express();
app.use(express.json({ limit: "2mb" }));
failInterruptedJobs();

function safeEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function requireSecret(req: Request, res: Response, next: NextFunction) {
  const supplied = String(req.headers["x-render-secret"] || ""); const expected = process.env.RENDER_SERVICE_SECRET || "";
  if (!expected || !safeEqual(supplied, expected)) { res.status(401).json({ error: "Unauthorized" }); return; } next();
}
async function notify(webhookUrl: string | undefined, payload: Record<string, unknown>) {
  if (!webhookUrl) return;
  await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-render-secret": process.env.RENDER_SERVICE_SECRET || "" }, body: JSON.stringify(payload) }).catch((error) => console.error("[webhook] Failed:", error));
}

app.post("/render", requireSecret, async (req, res) => {
  const parsed = RenderRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request", details: parsed.error.issues }); return; }
  const job = parsed.data; const existing = readJob(job.jobId);
  if (existing) { res.status(["QUEUED", "RENDERING", "UPLOADING"].includes(existing.status) ? 202 : 200).json(existing); return; }
  const now = new Date().toISOString(); writeJob({ jobId: job.jobId, status: "QUEUED", progress: 0, startedAt: now, updatedAt: now });
  res.status(202).json({ jobId: job.jobId, status: "QUEUED" });
  setImmediate(async () => {
    try {
      updateJob(job.jobId, { status: "RENDERING", progress: 1 });
      const result = await renderJob(job, (progress) => updateJob(job.jobId, { progress }), () => updateJob(job.jobId, { status: "UPLOADING", progress: 92 }));
      updateJob(job.jobId, { status: "SUCCEEDED", progress: 100, r2Key: result.r2Key, checksum: result.checksum, durationMs: result.durationMs, qa: result.qa, completedAt: new Date().toISOString() });
      await notify(job.webhookUrl, { jobId: job.jobId, status: "SUCCEEDED", r2Key: result.r2Key, checksum: result.checksum, durationMs: result.durationMs, qa: result.qa });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateJob(job.jobId, { status: "FAILED", errorCode: "RENDER_FAILED", error: message, completedAt: new Date().toISOString() });
      await notify(job.webhookUrl, { jobId: job.jobId, status: "FAILED", errorCode: "RENDER_FAILED", error: message });
    }
  });
});

app.get("/status/:jobId", requireSecret, (req, res) => { const job = readJob(req.params.jobId); if (!job) { res.status(404).json({ jobId: req.params.jobId, status: "NOT_FOUND" }); return; } res.json(job); });
app.get("/health", (_req, res) => res.json({ ok: true, jobs: jobCounts() }));
const port = Number(process.env.RENDER_SERVICE_PORT || 4100);
app.listen(port, "127.0.0.1", () => console.log(`[azyume-render-service] Listening on http://127.0.0.1:${port}`));
