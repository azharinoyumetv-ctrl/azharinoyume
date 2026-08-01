import { describe, expect, it } from "vitest";
import { VideoAnalysisManifestSchema } from "./video-analysis";
import { validateAutomatedEditPlan } from "./pipeline";

describe("grounded production artifacts", () => {
  it("accepts a structured multimodal analysis", () => {
    const manifest = VideoAnalysisManifestSchema.parse({
      summary: "A presenter demonstrates a product.",
      scenes: [
        {
          startMs: 0,
          endMs: 10_000,
          description: "Presenter introduces the product.",
          qualityScore: 90,
          energy: "medium",
        },
      ],
      audioProfile: { hasSpeech: true, hasMusic: false, noiseLevel: "low" },
      confidence: 88,
    });
    expect(manifest.scenes[0].spokenText).toBe("");
  });

  it("rejects edit ranges outside the verified source", () => {
    expect(() =>
      validateAutomatedEditPlan(
        {
          narrative: "Product introduction",
          hook: "Start with the demonstration",
          segments: [
            {
              sourceStartMs: 20_000,
              sourceEndMs: 70_000,
              purpose: "hook",
              treatment: "clean cut",
            },
          ],
          captionDirection: "minimal",
          musicDirection: "none",
          colorDirection: "natural",
          transitionDirection: "hard cuts",
          confidence: 90,
          riskFlags: [],
        },
        60_000,
        30_000,
      ),
    ).toThrow("invalid source range");
  });
});
