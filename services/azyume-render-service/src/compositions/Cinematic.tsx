import React from "react";
import { AbsoluteFill, useVideoConfig, interpolate, useCurrentFrame } from "remotion";
import { VideoLayer } from "../components/VideoLayer";
import { ColorGrade } from "../components/ColorGrade";
import { LowerThird } from "../components/LowerThird";

export interface CinematicProps {
  videoUrl: string;        // R2 presigned URL or direct URL of raw footage
  title?: string;
  subtitle?: string;
  showLowerThird?: boolean;
  zoomStart?: number;
  zoomEnd?: number;
  vignette?: boolean;
}

export const CINEMATIC_PROPS: CinematicProps = {
  videoUrl: "",
  title: "Your Title",
  subtitle: "Your Subtitle",
  showLowerThird: true,
  zoomStart: 1.0,
  zoomEnd: 1.05,
  vignette: true,
};

export const CinematicComposition: React.FC<CinematicProps> = ({
  videoUrl,
  title = "",
  subtitle,
  showLowerThird = true,
  zoomStart = 1.0,
  zoomEnd = 1.05,
  vignette = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Letterbox bars — 2.35:1 aspect ratio feel
  const barHeight = "8%";

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, fps * 0.8, durationInFrames - fps * 0.8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#000", opacity }}>
      <ColorGrade grade="cinematic">
        <VideoLayer src={videoUrl} zoom={zoomStart} zoomEnd={zoomEnd} />
      </ColorGrade>

      {/* Vignette overlay */}
      {vignette && (
        <AbsoluteFill
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Letterbox bars */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barHeight, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barHeight, background: "#000" }} />

      {/* Lower third */}
      {showLowerThird && title && (
        <LowerThird
          title={title}
          subtitle={subtitle}
          startFrame={fps * 1.5}
          durationFrames={durationInFrames - fps * 2}
          style="cinematic"
        />
      )}
    </AbsoluteFill>
  );
};
