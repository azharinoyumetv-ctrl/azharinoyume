import { describe, expect, it } from "vitest";
import { calculateRenderCredits } from "./quotes";

describe("calculateRenderCredits", () => {
  it("rounds verified duration up to a whole second", () => {
    expect(calculateRenderCredits(1, "basic")).toBe(2);
    expect(calculateRenderCredits(1_001, "plus")).toBe(12);
  });

  it("applies the tier rates", () => {
    expect(calculateRenderCredits(10_000, "basic")).toBe(20);
    expect(calculateRenderCredits(10_000, "plus")).toBe(60);
    expect(calculateRenderCredits(10_000, "premium")).toBe(130);
  });

  it("rejects missing or invalid media duration", () => {
    expect(() => calculateRenderCredits(0, "basic")).toThrow(
      "Verified media duration is required",
    );
    expect(() => calculateRenderCredits(Number.NaN, "basic")).toThrow();
  });
});
