import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RenderJobState } from "./contracts";

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "azyume-render-store-"));
process.env.RENDER_JOB_STATE_DIR = stateDir;

let store: typeof import("./job-store");

beforeAll(async () => {
  store = await import("./job-store");
});

afterAll(() => fs.rmSync(stateDir, { recursive: true, force: true }));

describe("durable render job store", () => {
  it("persists terminal state across reads", () => {
    const now = new Date().toISOString();
    const job = {
      jobId: "job/unsafe-id",
      status: "SUCCEEDED",
      progress: 100,
      request: { jobId: "job/unsafe-id", compositionId: "minimal", inputProps: {}, outputKey: "output.mp4" },
      createdAt: now,
      updatedAt: now,
    } as RenderJobState;
    store.writeJob(job);
    expect(store.readJob(job.jobId)?.status).toBe("SUCCEEDED");
    expect(store.jobCounts().SUCCEEDED).toBe(1);
  });

  it("marks interrupted work failed on service restart", () => {
    const now = new Date().toISOString();
    store.writeJob({
      jobId: "interrupted",
      status: "RENDERING",
      progress: 40,
      request: { jobId: "interrupted", compositionId: "minimal", inputProps: {}, outputKey: "output.mp4" },
      createdAt: now,
      updatedAt: now,
    } as RenderJobState);
    store.failInterruptedJobs();
    expect(store.readJob("interrupted")).toMatchObject({ status: "FAILED", errorCode: "SERVICE_RESTARTED" });
  });
});
