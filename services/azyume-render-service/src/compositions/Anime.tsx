import React from "react";
import { AbsoluteFill, useVideoConfig, interpolate, useCurrentFrame, spring } from "remotion";
import { VideoLayer } from "../components/VideoLayer";
import { ColorGrade } from "../components/ColorGrade";

export interface AnimeProps {
  videoUrl: string;
  title?: string;
  accentColor?: string; // hex
  glowEffect?: boolean;
}

export const ANIME_PROPS: AnimeProps = {
  videoUrl: "",
  title: "Episode Title",
  accentColor: "#e040fb",
  glowEffect: true,
};

export const AnimeComposition: React.FC<AnimeProps> = ({
  videoUrl,
  title = "",
  accentColor = "#e040fb",
  glowEffect = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const titleEnter = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const titleY = interpolate(titleEnter, [0, 1], [40, 0]);

  const fade = interpolate(
    frame,
    [0, fps * 0.5, durationInFrames - fps * 0.5, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#0a0015", opacity: fade }}>
      <ColorGrade grade="anime">
        <VideoLayer src={videoUrl} zoom={1.02} />
      </ColorGrade>

      {/* Speed lines overlay — top/bottom gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${accentColor}22 0%, transparent 15%, transparent 85%, ${accentColor}22 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Title card */}
      {title && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.75)",
              border: `2px solid ${accentColor}`,
              borderRadius: 6,
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 30,
              paddingRight: 30,
              boxShadow: glowEffect ? `0 0 24px ${accentColor}88` : undefined,
            }}
          >
            <span style={{ color: "#fff", fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>
              {title}
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
