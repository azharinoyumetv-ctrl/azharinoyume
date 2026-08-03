import React from "react";
import { AbsoluteFill, useVideoConfig, interpolate, useCurrentFrame } from "remotion";
import { VideoLayer } from "../components/VideoLayer";
import { ColorGrade } from "../components/ColorGrade";

export interface MinimalProps {
  videoUrl: string;
  title?: string;
  brandColor?: string;
}

export const MINIMAL_PROPS: MinimalProps = {
  videoUrl: "",
  title: "",
  brandColor: "#ffffff",
};

export const MinimalComposition: React.FC<MinimalProps> = ({
  videoUrl,
  title = "",
  brandColor = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const fade = interpolate(
    frame,
    [0, fps * 0.6, durationInFrames - fps * 0.6, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const lineWidth = interpolate(frame, [fps * 0.5, fps * 1.5], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fade }}>
      <ColorGrade grade="minimal">
        <VideoLayer src={videoUrl} zoom={1.0} />
      </ColorGrade>

      {title && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
          }}
        >
          {/* Animated accent line */}
          <div
            style={{
              width: lineWidth,
              height: 2,
              background: brandColor,
              marginBottom: 12,
              transition: "width 0.3s",
            }}
          />
          <span
            style={{
              color: brandColor,
              fontSize: 26,
              fontWeight: 300,
              letterSpacing: "0.15em",
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
