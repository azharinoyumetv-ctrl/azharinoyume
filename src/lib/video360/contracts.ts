import { z } from "zod";

export const CameraKeyframeSchema = z.object({
  timeMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60 * 1000),
  yaw: z.number().min(-180).max(180),
  pitch: z.number().min(-90).max(90),
  roll: z.number().min(-180).max(180),
  fov: z.number().min(35).max(140),
});

export const Editor360ConfigSchema = z
  .object({
    sourceProjection: z.enum(["equirectangular", "dual_fisheye"]),
    stereoMode: z.enum(["mono", "top_bottom", "side_by_side"]).default("mono"),
    outputAspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
    keyframes: z.array(CameraKeyframeSchema).min(1).max(240),
  })
  .superRefine((value, context) => {
    for (let index = 1; index < value.keyframes.length; index += 1) {
      if (value.keyframes[index].timeMs <= value.keyframes[index - 1].timeMs) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keyframes", index, "timeMs"],
          message: "Keyframes must be ordered and use unique times",
        });
      }
    }
  });

export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;
export type Editor360Config = z.infer<typeof Editor360ConfigSchema>;

function interpolateAngle(start: number, end: number, amount: number) {
  const delta = ((end - start + 540) % 360) - 180;
  return start + delta * amount;
}

export function cameraAt(
  keyframes: CameraKeyframe[],
  timeMs: number,
): CameraKeyframe {
  if (timeMs <= keyframes[0].timeMs) return { ...keyframes[0], timeMs };
  const last = keyframes[keyframes.length - 1];
  if (timeMs >= last.timeMs) return { ...last, timeMs };
  const nextIndex = keyframes.findIndex((frame) => frame.timeMs >= timeMs);
  const previous = keyframes[nextIndex - 1];
  const next = keyframes[nextIndex];
  const amount = (timeMs - previous.timeMs) / (next.timeMs - previous.timeMs);
  return {
    timeMs,
    yaw: interpolateAngle(previous.yaw, next.yaw, amount),
    pitch: previous.pitch + (next.pitch - previous.pitch) * amount,
    roll: interpolateAngle(previous.roll, next.roll, amount),
    fov: previous.fov + (next.fov - previous.fov) * amount,
  };
}

export function outputDimensions(
  aspectRatio: Editor360Config["outputAspectRatio"],
  resolution: string,
) {
  const longEdge = resolution.includes("4K")
    ? 3840
    : resolution.includes("720")
      ? 1280
      : 1920;
  if (aspectRatio === "9:16")
    return { width: Math.round((longEdge * 9) / 16 / 2) * 2, height: longEdge };
  if (aspectRatio === "1:1") return { width: longEdge, height: longEdge };
  return { width: longEdge, height: Math.round((longEdge * 9) / 16 / 2) * 2 };
}
