import { describe, expect, it } from "vitest";
import { buildCameraCommands, buildV360Filter, cameraAt } from "./render-360";

const keyframes = [
  { timeMs: 0, yaw: 170, pitch: 0, roll: 0, fov: 100 },
  { timeMs: 1000, yaw: -170, pitch: 20, roll: 10, fov: 80 },
];

describe("360 renderer", () => {
  it("interpolates yaw across the shortest seam path", () => {
    expect(cameraAt(keyframes, 500)).toMatchObject({
      timeMs: 500,
      yaw: 180,
      pitch: 10,
      roll: 5,
      fov: 90,
    });
  });

  it("builds runtime camera commands", () => {
    const commands = buildCameraCommands(keyframes, 1000);
    expect(commands).toContain("v360@view yaw");
    expect(commands).toContain("v360@view h_fov");
  });

  it("maps dual-fisheye stereo input into a flat output", () => {
    const filter = buildV360Filter(
      {
        kind: "360",
        sourceUrl: "https://example.com/source.mp4",
        sourceDurationMs: 1000,
        sourceProjection: "dual_fisheye",
        stereoMode: "side_by_side",
        outputAspectRatio: "16:9",
        keyframes,
      },
      1920,
      1080,
      "/tmp/camera.commands",
    );
    expect(filter).toContain("input=dfisheye");
    expect(filter).toContain("in_stereo=sbs");
    expect(filter).toContain("output=flat");
  });
});
