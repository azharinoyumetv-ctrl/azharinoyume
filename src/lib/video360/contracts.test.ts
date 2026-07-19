import { describe, expect, it } from "vitest";
import { cameraAt, Editor360ConfigSchema, outputDimensions } from "./contracts";

const camera = { yaw: 0, pitch: 0, roll: 0, fov: 90 };

describe("360 editor contract", () => {
  it("accepts an ordered spherical reframe", () => {
    expect(
      Editor360ConfigSchema.parse({
        sourceProjection: "equirectangular",
        keyframes: [
          { timeMs: 0, ...camera },
          { timeMs: 1200, ...camera, yaw: 45 },
        ],
      }).keyframes,
    ).toHaveLength(2);
  });

  it("rejects duplicate or reversed keyframe times", () => {
    expect(() =>
      Editor360ConfigSchema.parse({
        sourceProjection: "dual_fisheye",
        keyframes: [
          { timeMs: 1000, ...camera },
          { timeMs: 1000, ...camera },
        ],
      }),
    ).toThrow(/ordered/i);
  });

  it("calculates even output dimensions for each supported canvas", () => {
    expect(outputDimensions("16:9", "1080p")).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(outputDimensions("9:16", "1080p")).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(outputDimensions("1:1", "720p")).toEqual({
      width: 1280,
      height: 1280,
    });
  });

  it("interpolates across the 180 degree seam without spinning around", () => {
    expect(
      cameraAt(
        [
          { timeMs: 0, ...camera, yaw: 170 },
          { timeMs: 1000, ...camera, yaw: -170 },
        ],
        500,
      ).yaw,
    ).toBe(180);
  });
});
