import { ApiError } from "@/lib/api/authz";

export type EditingMode = "standard" | "360";

type RuntimeEnvironment = Record<string, string | undefined>;

const COMMON_REQUIREMENTS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
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
  const missing = requirements.filter((name) => !present(environment[name]));

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
