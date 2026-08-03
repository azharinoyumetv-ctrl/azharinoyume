import { ApiError } from "@/lib/api/authz";
import { selectMusicTrack, stockBrollLibrary } from "@/lib/production/production-assets";

export type EditingMode = "standard" | "360";

type RuntimeEnvironment = Record<string, string | undefined>;

const COMMON_REQUIREMENTS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "RENDER_SERVICE_URL",
  "RENDER_SERVICE_SECRET",
] as const;

const STANDARD_REQUIREMENTS = ["GEMINI_API_KEY"] as const;

function present(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getProductionReadiness(
  mode: EditingMode,
  environment: RuntimeEnvironment = process.env,
) {
  const requirements = mode === "standard"
    ? [...COMMON_REQUIREMENTS, ...STANDARD_REQUIREMENTS]
    : [...COMMON_REQUIREMENTS];
  const missing: string[] = requirements.filter((name) => !present(environment[name]));
  if (!present(environment.R2_ENDPOINT) && !present(environment.R2_ACCOUNT_ID))
    missing.push("R2_ENDPOINT_OR_ACCOUNT_ID");
  if (!present(environment.R2_BUCKET_NAME) && !present(environment.R2_BUCKET))
    missing.push("R2_BUCKET_NAME_OR_BUCKET");

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function requireProductionReadiness(mode: EditingMode) {
  const readiness = getProductionReadiness(mode);
  if (!readiness.ready) {
    throw new ApiError(
      503,
      "Automated video production is temporarily unavailable. No payment was created.",
    );
  }
  return readiness;
}

export function requireBriefCapabilityReadiness(input: {
  mode: EditingMode;
  tier: "basic" | "plus" | "premium";
  musicStyle: string;
}) {
  requireProductionReadiness(input.mode);
  if (input.mode !== "standard") return;
  try {
    if (input.musicStyle !== "none" && !selectMusicTrack(input.musicStyle)) {
      throw new ApiError(503, `No licensed music track is configured for ${input.musicStyle}. No order or payment was created.`);
    }
    const broll = input.tier === "basic" ? [] : stockBrollLibrary();
    if (input.tier === "plus" && broll.length === 0) {
      throw new ApiError(503, "The licensed B-roll library is not configured. No order or payment was created.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "The licensed production media library is invalid. No order or payment was created.");
  }
}
