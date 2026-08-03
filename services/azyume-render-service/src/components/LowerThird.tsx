import React from "react";
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

interface LowerThirdProps {
  title: string;
  subtitle?: string;
  startFrame: number;
  durationFrames: number;
  style?: "cinematic" | "minimal" | "corporate";
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  startFrame,
  durationFrames,
  style = "cinematic",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0 || localFrame > durationFrames) return null;

  const enter = spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 100 } });
  const exitDuration = Math.max(1, Math.min(30, Math.floor(durationFrames / 3)));
  const exit = localFrame > durationFrames - exitDuration
    ? interpolate(localFrame, [durationFrames - exitDuration, durationFrames], [1, 0], { extrapolateRight: "clamp" })
    : 1;
  const opacity = enter * exit;
  const translateY = interpolate(enter, [0, 1], [20, 0]);

  const bgColor = style === "cinematic"
    ? "rgba(180, 130, 0, 0.9)"
    : style === "corporate"
    ? "rgba(0, 80, 200, 0.9)"
    : "rgba(20, 20, 20, 0.85)";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 80,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          background: bgColor,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: 4,
          display: "inline-block",
        }}
      >
        <div style={{ color: "#fff", fontSize: 32, fontWeight: 700, fontFamily: "sans-serif" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 20, fontFamily: "sans-serif", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
