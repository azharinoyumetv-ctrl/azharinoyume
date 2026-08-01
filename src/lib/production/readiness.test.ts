import { describe, expect, it } from "vitest";
import { getProductionReadiness } from "./readiness";

const common = {
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "access",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "bucket",
  RENDER_SERVICE_URL: "http://127.0.0.1:4100",
  RENDER_SERVICE_SECRET: "render-secret",
};

describe("production readiness", () => {
  it("requires video understanding for standard editing", () => {
    const readiness = getProductionReadiness("standard", common);

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(["GEMINI_API_KEY"]);
  });

  it("accepts a complete standard production runtime", () => {
    const readiness = getProductionReadiness("standard", {
      ...common,
      GEMINI_API_KEY: "gemini-key",
    });

    expect(readiness).toEqual({ ready: true, missing: [] });
  });

  it("does not require Gemini for deterministic 360 rendering", () => {
    const readiness = getProductionReadiness("360", common);

    expect(readiness).toEqual({ ready: true, missing: [] });
  });

  it("treats whitespace-only secrets as missing", () => {
    const readiness = getProductionReadiness("360", {
      ...common,
      RENDER_SERVICE_SECRET: "   ",
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(["RENDER_SERVICE_SECRET"]);
  });
});
