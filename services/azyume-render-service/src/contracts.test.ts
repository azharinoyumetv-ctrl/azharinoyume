import { describe, expect, it } from "vitest";
import { RenderRequestSchema } from "./contracts";

describe("timeline render contract", () => {
  const request = {
    jobId: "render-job-123",
    compositionId: "timeline",
    inputProps: {},
    outputKey: "orders/order-1/drafts/draft.mp4",
    fps: 30,
    width: 1920,
    height: 1080,
    processing: {
      kind: "timeline" as const,
      sourceUrl: "https://storage.example/source.mp4",
      sourceDurationMs: 60_000,
      segments: [
        {
          sourceStartMs: 5_000,
          sourceEndMs: 12_000,
          purpose: "hook",
          treatment: "clean cut",
        },
      ],
      captions: [{ startMs: 0, endMs: 2_000, text: "Grounded caption" }],
      captionStyle: "minimal",
      style: "cinematic",
      colorGrade: "warm",
    },
  };

  it("accepts grounded source ranges", () => {
    expect(RenderRequestSchema.parse(request).processing?.kind).toBe("timeline");
  });

  it("rejects a source range beyond the verified duration", () => {
    expect(() =>
      RenderRequestSchema.parse({
        ...request,
        processing: {
          ...request.processing,
          segments: [{ ...request.processing.segments[0], sourceEndMs: 70_000 }],
        },
      }),
    ).toThrow();
  });

  it("rejects timeline processing with a different composition", () => {
    expect(() => RenderRequestSchema.parse({ ...request, compositionId: "cinematic" })).toThrow();
  });
});
