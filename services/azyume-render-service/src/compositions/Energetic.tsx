import React from "react";
import {
  AbsoluteFill, useVideoConfig, interpolate, useCurrentFrame, Sequence
} from "remotion";
import { VideoLayer } from "../components/VideoLayer";
import { ColorGrade } from "../components/ColorGrade";

export interface EnergeticProps {
  videoUrl: string;
  title?: string;
  accentColor?: string;
  flashOnBeat?: boolean;
}

export const ENERGETIC_PROPS: EnergeticProps = {
  videoUrl: "",
  title: "",
  accentColor: "#ff3300",
  flashOnBeat: false,
};

export const EnergeticComposition: React.FC<EnergeticProps> = ({
  videoUrl,
  title = "",
  accentColor = "#ff3300",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const fade = interpolate(
    frame,
    [0, fps * 0.3, durationInFrames - fps * 0.3, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slight zoom pulse every 15 frames (simulates beat)
  const beatPeriod = 15;
  const beatFrame = frame % beatPeriod;
  const beatZoom = interpolate(beatFrame, [0, 3, beatPeriod], [1.02, 1.06, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fade }}>
      <ColorGrade grade="energetic">
        <VideoLayer src={videoUrl} zoom={beatZoom} />
      </ColorGrade>

      {/* Diagonal accent stripe */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}00)`,
        }}
      />

      {title && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: 72,
              fontWeight: 900,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textShadow: `0 0 40px ${accentColor}, 0 4px 16px rgba(0,0,0,0.9)`,
            }}
          >
            {title}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
