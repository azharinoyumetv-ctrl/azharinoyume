import { afterEach, describe, expect, it } from "vitest";
import { getProductionReadiness, requireBriefCapabilityReadiness } from "./readiness";

const common = {
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "access",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "bucket",
  RENDER_SERVICE_URL: "http://127.0.0.1:4100",
  RENDER_SERVICE_SECRET: "render-secret",
};

describe("production readiness", () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });
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

  it("accepts the existing full-endpoint and bucket environment aliases", () => {
    const readiness = getProductionReadiness("standard", {
      R2_ACCESS_KEY_ID: common.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: common.R2_SECRET_ACCESS_KEY,
      RENDER_SERVICE_URL: common.RENDER_SERVICE_URL,
      RENDER_SERVICE_SECRET: common.RENDER_SERVICE_SECRET,
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "existing-bucket",
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

  it("blocks a paid brief when the requested licensed music style is unavailable", () => {
    Object.assign(process.env, common, {
      GEMINI_API_KEY: "gemini-key",
      AZYUME_MUSIC_LIBRARY_JSON: JSON.stringify([
        { id: "music-1", style: "cinematic", r2Key: "library/music/cinematic.mp3", licenseId: "license-1", volume: 0.14 },
      ]),
    });

    expect(() => requireBriefCapabilityReadiness({ mode: "standard", tier: "basic", musicStyle: "romantic-piano" }))
      .toThrow(/No licensed music track/);
  });

  it("blocks Plus before payment when the licensed B-roll library is empty", () => {
    Object.assign(process.env, common, {
      GEMINI_API_KEY: "gemini-key",
      AZYUME_MUSIC_LIBRARY_JSON: JSON.stringify([
        { id: "music-1", style: "default", r2Key: "library/music/default.mp3", licenseId: "license-1", volume: 0.14 },
      ]),
      AZYUME_BROLL_LIBRARY_JSON: "[]",
    });

    expect(() => requireBriefCapabilityReadiness({ mode: "standard", tier: "plus", musicStyle: "cinematic" }))
      .toThrow(/B-roll library/);
  });
});
