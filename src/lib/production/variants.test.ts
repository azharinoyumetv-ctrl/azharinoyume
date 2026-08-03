import { describe, expect, it } from "vitest";
import { projectOutputVariants } from "./variants";

describe("projectOutputVariants", () => {
  it("keeps Basic to the single purchased master output", () => {
    expect(projectOutputVariants({ tier: "basic", aspectRatio: "9:16", resolution: "1080p", frameRate: "30fps" }))
      .toEqual([{ key: "master", aspectRatio: "9:16", resolution: "1080p", frameRate: "30fps" }]);
  });

  it("creates three distinct Plus deliverables", () => {
    const variants = projectOutputVariants({ tier: "plus", aspectRatio: "16:9", resolution: "1080p", frameRate: "30fps" });

    expect(variants).toHaveLength(3);
    expect(new Set(variants.map((variant) => variant.aspectRatio)).size).toBe(3);
    expect(variants[0].key).toBe("master");
  });

  it("keeps the Premium master in 4K while social variants remain production-safe 1080p", () => {
    const variants = projectOutputVariants({ tier: "premium", aspectRatio: "16:9", resolution: "4K", frameRate: "30fps" });

    expect(variants[0].resolution).toBe("4K");
    expect(variants.slice(1).every((variant) => variant.resolution === "1080p")).toBe(true);
  });
});
