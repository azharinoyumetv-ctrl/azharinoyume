import React from "react";
import { Composition } from "remotion";

// SaaS video editing compositions
import { CinematicComposition, CINEMATIC_PROPS } from "./compositions/Cinematic";
import { AnimeComposition, ANIME_PROPS } from "./compositions/Anime";
import { MinimalComposition, MINIMAL_PROPS } from "./compositions/Minimal";
import { CorporateComposition, CORPORATE_PROPS } from "./compositions/Corporate";
import { EnergeticComposition, ENERGETIC_PROPS } from "./compositions/Energetic";
import { calculateTimelineMetadata, TimelineComposition, TIMELINE_PROPS } from "./compositions/Timeline";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="timeline"
        component={TimelineComposition}
        defaultProps={TIMELINE_PROPS}
        calculateMetadata={calculateTimelineMetadata}
        fps={30}
        durationInFrames={30}
        width={1920}
        height={1080}
      />
      {/* ── SaaS video editing styles ────────────────────────────── */}
      <Composition
        id="cinematic"
        component={CinematicComposition as unknown as React.ComponentType<Record<string, unknown>>}
        defaultProps={CINEMATIC_PROPS}
        fps={24}
        durationInFrames={30 * 24} // 30s preview; actual duration driven by inputProps
        width={1920}
        height={1080}
      />
      <Composition
        id="anime"
        component={AnimeComposition as unknown as React.ComponentType<Record<string, unknown>>}
        defaultProps={ANIME_PROPS}
        fps={24}
        durationInFrames={30 * 24}
        width={1920}
        height={1080}
      />
      <Composition
        id="minimal"
        component={MinimalComposition as unknown as React.ComponentType<Record<string, unknown>>}
        defaultProps={MINIMAL_PROPS}
        fps={30}
        durationInFrames={30 * 30}
        width={1920}
        height={1080}
      />
      <Composition
        id="corporate"
        component={CorporateComposition as unknown as React.ComponentType<Record<string, unknown>>}
        defaultProps={CORPORATE_PROPS}
        fps={30}
        durationInFrames={30 * 30}
        width={1920}
        height={1080}
      />
      <Composition
        id="energetic"
        component={EnergeticComposition as unknown as React.ComponentType<Record<string, unknown>>}
        defaultProps={ENERGETIC_PROPS}
        fps={30}
        durationInFrames={30 * 30}
        width={1920}
        height={1080}
      />
    </>
  );
};
