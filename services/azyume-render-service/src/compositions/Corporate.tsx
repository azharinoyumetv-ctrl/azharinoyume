import React from "react";
import { AbsoluteFill, useVideoConfig, interpolate, useCurrentFrame } from "remotion";
import { VideoLayer } from "../components/VideoLayer";
import { ColorGrade } from "../components/ColorGrade";
import { LowerThird } from "../components/LowerThird";

export interface CorporateProps {
  videoUrl: string;
  speakerName?: string;
  speakerTitle?: string;
  companyName?: string;
  brandColor?: string;
  logoUrl?: string;
}

export const CORPORATE_PROPS: CorporateProps = {
  videoUrl: "",
  speakerName: "John Smith",
  speakerTitle: "CEO",
  companyName: "Company Inc.",
  brandColor: "#0052cc",
};

export const CorporateComposition: React.FC<CorporateProps> = ({
  videoUrl,
  speakerName = "",
  speakerTitle = "",
  companyName = "",
  brandColor = "#0052cc",
  logoUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const fade = interpolate(
    frame,
    [0, fps * 0.5, durationInFrames - fps * 0.5, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fade }}>
      <ColorGrade grade="corporate">
        <VideoLayer src={videoUrl} zoom={1.0} />
      </ColorGrade>

      {/* Top bar with company name */}
      {companyName && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 60,
            background: `${brandColor}e0`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 40,
            paddingRight: 40,
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 20, fontFamily: "sans-serif" }}>
            {companyName}
          </span>
          {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 36, objectFit: "contain" }} />}
        </div>
      )}

      {/* Speaker lower third */}
      {speakerName && (
        <LowerThird
          title={speakerName}
          subtitle={speakerTitle}
          startFrame={fps * 1}
          durationFrames={durationInFrames - fps * 1.5}
          style="corporate"
        />
      )}
    </AbsoluteFill>
  );
};
