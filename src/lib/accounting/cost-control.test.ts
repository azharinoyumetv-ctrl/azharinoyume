import { describe, expect, it } from "vitest";
import { projectDirectCost } from "@/lib/accounting/cost-control";

describe("projectDirectCost", () => {
  it("includes gateway, incurred, and upcoming production cost", () => {
    expect(projectDirectCost({
      incurredCost: 1.25,
      gatewayFee: 0.75,
      upcomingCostUsd: 0.5,
    })).toBe(2.5);
  });

  it("does not hide a zero upcoming operation", () => {
    expect(projectDirectCost({
      incurredCost: 2,
      gatewayFee: 0.5,
      upcomingCostUsd: 0,
    })).toBe(2.5);
  });
});
