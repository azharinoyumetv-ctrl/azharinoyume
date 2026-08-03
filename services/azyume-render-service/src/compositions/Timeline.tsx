import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { ColorGrade, type GradePreset } from "../components/ColorGrade";
import { LowerThird } from "../components/LowerThird";
import { VideoLayer } from "../components/VideoLayer";

type TimelineSegment = {
  sourceStartMs: number;
  sourceEndMs: number;
  purpose: string;
  treatment: string;
};

type TimelineCaption = {
  startMs: number;
  endMs: number;
  text: string;
};

type TimelineBroll = {
  videoUrl: string;
  startMs: number;
  durationMs: number;
};

export interface TimelineProps extends Record<string, unknown> {
  videoUrl: string;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  style?: string;
  colorGrade?: string;
  segments: TimelineSegment[];
  captions?: TimelineCaption[];
  captionStyle?: string;
  music?: { url: string; volume: number } | null;
  bRoll?: TimelineBroll[];
  brand?: {
    name?: string | null;
    primaryColor: string;
    secondaryColor: string;
    rules?: string | null;
  } | null;
}

export const TIMELINE_PROPS: TimelineProps = {
  videoUrl: "",
  title: "",
  subtitle: "",
  accentColor: "#d4a017",
  style: "cinematic",
  colorGrade: "natural",
  segments: [],
  captions: [],
  captionStyle: "minimal",
  music: null,
  bRoll: [],
  brand: null,
};

export const calculateTimelineMetadata: CalculateMetadataFunction<TimelineProps> = ({ props }) => {
  const durationMs = props.segments.reduce(
    (total, segment) => total + Math.max(0, segment.sourceEndMs - segment.sourceStartMs),
    0,
  );
  return { durationInFrames: Math.max(1, Math.ceil((durationMs / 1_000) * 30)) };
};

function MusicBed({ music, captions }: { music: NonNullable<TimelineProps["music"]>; captions: TimelineCaption[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1_000;
  const speechActive = captions.some((caption) => timeMs >= caption.startMs && timeMs < caption.endMs);
  return <Audio src={music.url} loop volume={speechActive ? music.volume * 0.32 : music.volume} />;
}

function CaptionOverlay({ captions, style, liftForLowerThird }: { captions: TimelineCaption[]; style: string; liftForLowerThird: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1_000;
  const caption = captions.find((item) => timeMs >= item.startMs && timeMs < item.endMs);
  if (!caption) return null;
  const bold = style === "bold-viral" || style === "karaoke";
  const corporate = style === "corporate-lower-thirds";
  return (
    <div
      style={{
        position: "absolute",
        left: corporate ? "7%" : "10%",
        right: corporate ? "28%" : "10%",
        bottom: liftForLowerThird ? "25%" : corporate ? "8%" : "10%",
        textAlign: corporate ? "left" : "center",
        color: "white",
        fontFamily: "Arial, sans-serif",
        fontWeight: bold ? 900 : 700,
        fontSize: bold ? 52 : 40,
        lineHeight: 1.2,
        padding: "14px 22px",
        borderRadius: 12,
        background: corporate ? "rgba(9, 55, 120, 0.9)" : "rgba(0, 0, 0, 0.62)",
        textShadow: "0 2px 8px rgba(0,0,0,0.9)",
      }}
    >
      {caption.text}
    </div>
  );
}

function gradeFor(style: string, colorGrade: string): GradePreset {
  const value = `${style} ${colorGrade}`.toLowerCase();
  if (value.includes("anime")) return "anime";
  if (value.includes("corporate")) return "corporate";
  if (value.includes("energetic") || value.includes("viral")) return "energetic";
  if (value.includes("emotional") || value.includes("moody")) return "emotional";
  if (value.includes("minimal") || value.includes("natural")) return "minimal";
  return "cinematic";
}

export const TimelineComposition: React.FC<TimelineProps> = ({
  videoUrl,
  title = "",
  subtitle = "",
  accentColor = "#d4a017",
  style = "cinematic",
  colorGrade = "natural",
  segments,
  captions = [],
  captionStyle = "minimal",
  music = null,
  bRoll = [],
  brand = null,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fade = interpolate(
    frame,
    [0, Math.min(fps / 2, durationInFrames / 4), Math.max(durationInFrames - fps / 2, durationInFrames / 2), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const lowerThirdStart = Math.min(Math.round(fps * 0.25), Math.max(0, Math.floor(durationInFrames * 0.1)));
  const lowerThirdDuration = Math.max(1, Math.min(Math.round(fps * 4), Math.floor(durationInFrames * 0.8)));
  const lowerThirdVisible = Boolean(title) && frame >= lowerThirdStart && frame < lowerThirdStart + lowerThirdDuration;
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fade }}>
      <ColorGrade grade={gradeFor(style, colorGrade)}>
        {segments.map((segment, index) => {
          const duration = Math.max(1, Math.round(((segment.sourceEndMs - segment.sourceStartMs) / 1_000) * fps));
          const from = cursor;
          cursor += duration;
          return (
            <Sequence key={`${segment.sourceStartMs}-${segment.sourceEndMs}-${index}`} from={from} durationInFrames={duration}>
              <VideoLayer
                src={videoUrl}
                startFrom={Math.round((segment.sourceStartMs / 1_000) * fps)}
                zoom={style.toLowerCase().includes("energetic") ? 1.03 : 1}
                zoomEnd={style.toLowerCase().includes("cinematic") ? 1.04 : undefined}
              />
            </Sequence>
          );
        })}
      </ColorGrade>
      {bRoll.map((asset, index) => {
        const from = Math.max(0, Math.round((asset.startMs / 1_000) * fps));
        const durationInFrames = Math.max(1, Math.round((asset.durationMs / 1_000) * fps));
        return (
          <Sequence key={`${asset.videoUrl}-${index}`} from={from} durationInFrames={durationInFrames}>
            <OffthreadVideo muted src={asset.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
        );
      })}
      {music && <MusicBed music={music} captions={captions} />}
      {title && (
        <LowerThird
          title={title}
          subtitle={subtitle}
          startFrame={lowerThirdStart}
          durationFrames={lowerThirdDuration}
          style={style.toLowerCase().includes("corporate") ? "corporate" : style.toLowerCase().includes("minimal") ? "minimal" : "cinematic"}
        />
      )}
      {captionStyle !== "none" && <CaptionOverlay captions={captions} style={captionStyle} liftForLowerThird={lowerThirdVisible} />}
      {brand?.name && (
        <div style={{ position: "absolute", right: "4%", top: "4%", maxWidth: "40%", color: brand.secondaryColor, background: "rgba(0,0,0,.42)", border: `1px solid ${brand.primaryColor}66`, borderRadius: 10, padding: "10px 16px", fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: ".02em" }}>
          {brand.name}
        </div>
      )}
      <div style={{ position: "absolute", inset: "auto 0 0", height: 6, background: brand?.primaryColor || accentColor }} />
    </AbsoluteFill>
  );
};
