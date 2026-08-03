import { z } from "zod";
import { PLATFORM_PRESETS, PROJECT_TIERS, STYLE_DIRECTIONS } from "@/lib/production/catalog";

const StyleSlugs = STYLE_DIRECTIONS.map((style) => style.slug) as [string, ...string[]];
const PlatformKeys = Object.keys(PLATFORM_PRESETS) as [string, ...string[]];

export const ProductionBriefInputSchema = z.object({
  tier: z.enum(["basic", "plus", "premium"]),
  purpose: z.string().trim().min(2).max(200),
  audience: z.string().trim().min(2).max(300),
  visualStyle: z.enum(StyleSlugs),
  mood: z.string().trim().min(2).max(100),
  editingPace: z.string().trim().min(2).max(100),
  colorGrade: z.string().trim().min(2).max(100),
  captionStyle: z.string().trim().min(2).max(100),
  musicStyle: z.string().trim().min(2).max(100),
  brandName: z.string().trim().max(120).default(""),
  brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#d4a017"),
  brandSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  brandRules: z.string().trim().max(2_000).default(""),
  platform: z.enum(PlatformKeys),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5", "custom"]),
  resolution: z.enum(["720p", "1080p", "1440p", "4K"]),
  frameRate: z.enum(["24fps", "30fps", "60fps"]),
  exportFormat: z.enum(["MP4", "MOV"]),
  compression: z.enum(["smaller", "balanced", "highest"]),
  targetDurationSeconds: z.number().int().positive().max(3600),
  storyPriority: z.string().trim().min(2).max(500),
  mandatoryContent: z.string().trim().max(2_000),
  excludedContent: z.string().trim().max(2_000),
  creativeFreedom: z.enum(["low", "balanced", "high"]),
  prompt: z.string().trim().min(10).max(10_000),
  briefConfirmed: z.literal(true),
});

export type ProductionBriefInput = z.infer<typeof ProductionBriefInputSchema>;

export type BriefIssue = {
  code: string;
  field: keyof ProductionBriefInput;
  severity: "error" | "warning";
  message: string;
  suggestion: string;
};

function normalizedTerms(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 5),
  );
}

export function evaluateProductionBrief(input: ProductionBriefInput) {
  const issues: BriefIssue[] = [];
  const tier = PROJECT_TIERS[input.tier];
  const preset = PLATFORM_PRESETS[input.platform as keyof typeof PLATFORM_PRESETS];

  if (input.targetDurationSeconds > tier.finalSeconds) {
    issues.push({
      code: "DURATION_EXCEEDS_TIER",
      field: "targetDurationSeconds",
      severity: "error",
      message: `This tier includes up to ${tier.finalSeconds} finished seconds.`,
      suggestion: "Shorten the requested output or choose a higher tier.",
    });
  }

  if (input.resolution === "4K" && input.tier !== "premium") {
    issues.push({
      code: "FOUR_K_REQUIRES_PREMIUM",
      field: "resolution",
      severity: "error",
      message: "4K delivery is included only with Premium.",
      suggestion: "Choose 1080p or upgrade to Premium.",
    });
  }

  if (input.platform !== "custom" && input.aspectRatio !== preset.aspectRatio) {
    issues.push({
      code: "PLATFORM_ASPECT_MISMATCH",
      field: "aspectRatio",
      severity: "warning",
      message: `${preset.label} normally uses ${preset.aspectRatio}.`,
      suggestion: `Use ${preset.aspectRatio}, unless the different shape is intentional.`,
    });
  }

  if (input.prompt.length < 40) {
    issues.push({
      code: "PROMPT_TOO_GENERAL",
      field: "prompt",
      severity: "warning",
      message: "The creative direction is still very short.",
      suggestion: "Describe the intended feeling, story, important moments, and what should be avoided.",
    });
  }

  if (!input.mandatoryContent && input.creativeFreedom === "low") {
    issues.push({
      code: "LOW_FREEDOM_WITHOUT_MANDATORY_CONTENT",
      field: "mandatoryContent",
      severity: "error",
      message: "Low creative freedom needs explicit must-include instructions.",
      suggestion: "List the people, shots, dialogue, logos, or moments that must appear.",
    });
  } else if (!input.mandatoryContent) {
    issues.push({
      code: "NO_MANDATORY_CONTENT",
      field: "mandatoryContent",
      severity: "warning",
      message: "No must-include content has been identified.",
      suggestion: "Write “No specific moments” if the engine may choose freely.",
    });
  }

  if (!input.excludedContent) {
    issues.push({
      code: "NO_EXCLUSIONS",
      field: "excludedContent",
      severity: "warning",
      message: "No exclusions or sensitive content rules have been identified.",
      suggestion: "Write “Nothing specific” if there is nothing to exclude.",
    });
  }

  const mandatory = normalizedTerms(input.mandatoryContent);
  const excluded = normalizedTerms(input.excludedContent);
  const overlap = [...mandatory].filter((term) => excluded.has(term));
  if (overlap.length) {
    issues.push({
      code: "CONTENT_CONFLICT",
      field: "excludedContent",
      severity: "error",
      message: `The must-include and exclude rules overlap: ${overlap.slice(0, 3).join(", ")}.`,
      suggestion: "Clarify which instruction has priority.",
    });
  }

  const ambiguityScore = Math.min(
    100,
    issues.reduce((score, issue) => score + (issue.severity === "error" ? 30 : 10), 0),
  );
  const style = STYLE_DIRECTIONS.find((candidate) => candidate.slug === input.visualStyle)!;

  return {
    ambiguityScore,
    readyForProduction: !issues.some((issue) => issue.severity === "error"),
    issues,
    structuredBrief: {
      version: 1,
      commercial: {
        tier: input.tier,
        basePriceUsd: tier.priceUsd,
        sourceLimitMinutes: tier.sourceMinutes,
        finalLimitSeconds: tier.finalSeconds,
        includedRevisions: tier.revisions,
        outputVariants: tier.outputVariants,
      },
      intent: {
        purpose: input.purpose,
        audience: input.audience,
        storyPriority: input.storyPriority,
        mandatoryContent: input.mandatoryContent,
        excludedContent: input.excludedContent,
        creativeFreedom: input.creativeFreedom,
        customerPrompt: input.prompt,
      },
      creativeDirection: {
        style: input.visualStyle,
        styleLabel: style.title,
        mood: input.mood,
        pace: input.editingPace,
        colorGrade: input.colorGrade,
        captionStyle: input.captionStyle,
        musicStyle: input.musicStyle,
        brand: {
          name: input.brandName,
          primaryColor: input.brandPrimaryColor,
          secondaryColor: input.brandSecondaryColor,
          rules: input.brandRules,
        },
      },
      delivery: {
        platform: input.platform,
        platformLabel: preset.label,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        frameRate: input.frameRate,
        exportFormat: input.exportFormat,
        compression: input.compression,
        targetDurationSeconds: input.targetDurationSeconds,
      },
      approval: {
        confirmedByCustomer: input.briefConfirmed,
        ambiguityScore,
        issues,
      },
    },
  };
}
