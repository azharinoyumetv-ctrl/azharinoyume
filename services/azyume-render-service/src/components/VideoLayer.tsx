import React from "react";
import { OffthreadVideo, useVideoConfig, interpolate, useCurrentFrame } from "remotion";

interface VideoLayerProps {
  src: string;
  startFrom?: number;
  zoom?: number;       // 1.0 = no zoom, 1.1 = 10% zoom-in
  zoomEnd?: number;
  panX?: number;       // -1 to 1
  panY?: number;
}

export const VideoLayer: React.FC<VideoLayerProps> = ({
  src,
  startFrom = 0,
  zoom = 1,
  zoomEnd,
  panX = 0,
  panY = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const currentZoom = zoomEnd != null
    ? interpolate(frame, [0, durationInFrames], [zoom, zoomEnd], { extrapolateRight: "clamp" })
    : zoom;

  const translateX = panX * 100;
  const translateY = panY * 100;

  if (!src) return null;

  return (
    <OffthreadVideo
      src={src}
      startFrom={startFrom}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${currentZoom}) translate(${translateX}%, ${translateY}%)`,
      }}
    />
  );
};
