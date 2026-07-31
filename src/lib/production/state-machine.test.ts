import { describe, expect, it } from "vitest";
import { assertProductionTransition } from "@/lib/production/state-machine";

describe("assertProductionTransition", () => {
  it("allows the paid project to enter the analysis queue", () => {
    expect(() =>
      assertProductionTransition("AWAITING_PAYMENT", "ANALYSIS_QUEUED"),
    ).not.toThrow();
  });

  it("prevents production from skipping payment and planning gates", () => {
    expect(() =>
      assertProductionTransition("AWAITING_PAYMENT", "DRAFT_RENDERING"),
    ).toThrow(/Invalid production transition/);
    expect(() =>
      assertProductionTransition("ANALYZING", "DELIVERED"),
    ).toThrow(/Invalid production transition/);
  });
});
