import { z } from "zod";

const CameraKeyframeSchema = z.object({
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

const Processing360Schema = z.object({
  kind: z.literal("360"),
  sourceUrl: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "360 sources must use HTTPS",
    ),
  sourceDurationMs: z
    .number()
    .int()
    .positive()
    .max(24 * 60 * 60 * 1000),
  sourceProjection: z.enum(["equirectangular", "dual_fisheye"]),
  stereoMode: z.enum(["mono", "top_bottom", "side_by_side"]),
  outputAspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  keyframes: z.array(CameraKeyframeSchema).min(1).max(240),
});

const TimelineSegmentSchema = z.object({
  sourceStartMs: z.number().int().min(0),
  sourceEndMs: z.number().int().positive(),
  purpose: z.string().min(1).max(300),
  treatment: z.string().min(1).max(500),
}).refine((segment) => segment.sourceEndMs > segment.sourceStartMs, {
  message: "Timeline segment end must be after start",
});

const TimelineCaptionSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  text: z.string().min(1).max(2_000),
}).refine((caption) => caption.endMs > caption.startMs, {
  message: "Timeline caption end must be after start",
});

const ProcessingTimelineSchema = z.object({
  kind: z.literal("timeline"),
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://"), "Timeline sources must use HTTPS"),
  sourceDurationMs: z.number().int().positive().max(24 * 60 * 60 * 1000),
  segments: z.array(TimelineSegmentSchema).min(1).max(30),
  captions: z.array(TimelineCaptionSchema).max(300).default([]),
  captionStyle: z.string().min(1).max(100).default("minimal"),
  style: z.string().min(1).max(100),
  colorGrade: z.string().min(1).max(100),
}).superRefine((processing, context) => {
  processing.segments.forEach((segment, index) => {
    if (segment.sourceEndMs > processing.sourceDurationMs) {
      context.addIssue({
        code: "custom",
        path: ["segments", index, "sourceEndMs"],
        message: "Timeline segment exceeds source duration",
      });
    }
  });
});

export const RenderRequestSchema = z.object({
  jobId: z.string().min(8),
  compositionId: z.string().min(1),
  inputProps: z.record(z.string(), z.unknown()),
  outputKey: z.string().min(1),
  webhookUrl: z.string().url().optional(),
  fps: z.number().int().min(1).max(60).default(30),
  durationInFrames: z.number().int().min(1).optional(),
  width: z.number().int().min(320).max(7680).default(1920),
  height: z.number().int().min(240).max(4320).default(1080),
  concurrency: z.number().int().min(1).max(8).default(2),
  processing: z.discriminatedUnion("kind", [
    Processing360Schema,
    ProcessingTimelineSchema,
  ]).optional(),
}).superRefine((request, context) => {
  if (request.processing?.kind === "timeline" && request.compositionId !== "timeline") {
    context.addIssue({
      code: "custom",
      path: ["compositionId"],
      message: "Timeline processing requires the timeline composition",
    });
  }
});

export type RenderRequest = z.infer<typeof RenderRequestSchema>;
export type RenderJobState = {
  jobId: string;
  status: "QUEUED" | "RENDERING" | "UPLOADING" | "SUCCEEDED" | "FAILED";
  progress: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  r2Key?: string;
  checksum?: string;
  durationMs?: number;
  qa?: import("./media-qa").MediaQaResult;
  errorCode?: string;
  error?: string;
};
