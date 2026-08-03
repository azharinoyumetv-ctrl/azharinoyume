import { PROJECT_TIERS, type ProjectTier } from "@/lib/production/catalog";

export type OutputVariant = {
  key: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  resolution: string;
  frameRate: string;
};

export function projectOutputVariants(input: {
  tier: ProjectTier;
  aspectRatio: string;
  resolution: string;
  frameRate: string;
}): OutputVariant[] {
  const requested = (["16:9", "9:16", "1:1", "4:5"].includes(input.aspectRatio)
    ? input.aspectRatio
    : "16:9") as OutputVariant["aspectRatio"];
  const candidates: OutputVariant["aspectRatio"][] = [requested, "9:16", "1:1", "16:9", "4:5"];
  const unique = [...new Set(candidates)].slice(0, PROJECT_TIERS[input.tier].outputVariants);
  return unique.map((aspectRatio, index) => ({
    key: index === 0 ? "master" : aspectRatio === "9:16" ? "vertical" : aspectRatio === "1:1" ? "square" : aspectRatio === "4:5" ? "portrait" : "horizontal",
    aspectRatio,
    resolution: index === 0 ? input.resolution : "1080p",
    frameRate: input.frameRate,
  }));
}
