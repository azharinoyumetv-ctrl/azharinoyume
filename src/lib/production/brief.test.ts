import { describe, expect, it } from "vitest";
import { evaluateProductionBrief, type ProductionBriefInput } from "@/lib/production/brief";

const validBrief: ProductionBriefInput = {
  tier: "plus",
  purpose: "Wedding highlight",
  audience: "Family and friends",
  visualStyle: "cinematic",
  mood: "emotional",
  editingPace: "smooth-cinematic",
  colorGrade: "warm",
  captionStyle: "minimal",
  musicStyle: "romantic-piano",
  platform: "reels",
  aspectRatio: "9:16",
  resolution: "1080p",
  frameRate: "30fps",
  exportFormat: "MP4",
  compression: "balanced",
  targetDurationSeconds: 60,
  storyPriority: "The couple entrance, vows, and family reactions",
  mandatoryContent: "Include the vows and ring exchange",
  excludedContent: "Exclude shaky hallway footage",
  creativeFreedom: "balanced",
  prompt: "Create an emotional wedding story with an intimate opening, warm pacing, and a joyful finish.",
  briefConfirmed: true,
};

describe("evaluateProductionBrief", () => {
  it("accepts a complete brief that fits the tier and destination", () => {
    const result = evaluateProductionBrief(validBrief);
    expect(result.readyForProduction).toBe(true);
    expect(result.ambiguityScore).toBe(0);
    expect(result.structuredBrief.commercial.basePriceUsd).toBe(44.99);
  });

  it("blocks tier and output conflicts before production", () => {
    const result = evaluateProductionBrief({
      ...validBrief,
      tier: "basic",
      resolution: "4K",
      targetDurationSeconds: 120,
    });
    expect(result.readyForProduction).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["DURATION_EXCEEDS_TIER", "FOUR_K_REQUIRES_PREMIUM"]),
    );
  });

  it("requires precise constraints when creative freedom is low", () => {
    const result = evaluateProductionBrief({
      ...validBrief,
      creativeFreedom: "low",
      mandatoryContent: "",
    });
    expect(result.readyForProduction).toBe(false);
    expect(result.issues.some((issue) => issue.code === "LOW_FREEDOM_WITHOUT_MANDATORY_CONTENT")).toBe(true);
  });
});
