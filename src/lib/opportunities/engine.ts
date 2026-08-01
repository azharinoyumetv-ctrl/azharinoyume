import { Prisma } from "@/generated/prisma/client";
import { callClaude } from "@/lib/ai/claude";
import { prisma } from "@/lib/prisma";

export type CanonicalOpportunity = {
  externalId: string;
  title: string;
  description: string;
  sourceUrl: string;
  source: string;
  category?: string;
  location?: string;
  engagementModel?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  publishedAt?: string;
  attribution: string;
};

type OpportunityScores = {
  score: number;
  legitimacyScore: number;
  capabilityScore: number;
  profitabilityScore: number;
  riskScore: number;
  productRoute: string;
  routeDecision:
    | "DIRECT_FULFILMENT"
    | "CUSTOM_QUOTE"
    | "PRODUCT_RESEARCH";
  serviceFamily: string;
  category: string;
  requiredSkills: string[];
  riskFlags: string[];
  breakdown: Record<string, number | string>;
};

type RemotiveJob = {
  id?: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  tags?: string[];
};

type RemotiveResponse = { jobs?: RemotiveJob[] };

type RemoteOkJob = {
  id?: number | string;
  epoch?: number;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url?: string;
  apply_url?: string;
};

type HimalayasJob = {
  title?: string;
  excerpt?: string;
  companyName?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string;
  currency?: string | null;
  locationRestrictions?: Array<
    string | { name?: string; alpha2?: string; slug?: string }
  >;
  categories?: string[];
  parentCategories?: string[];
  description?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
};

type HimalayasResponse = { jobs?: HimalayasJob[] };

export const SUPPORTED_CONNECTOR_TYPES = [
  "remotive_api",
  "remoteok_api",
  "himalayas_api",
] as const;

export type SupportedConnectorType = (typeof SUPPORTED_CONNECTOR_TYPES)[number];

export function connectorTypeIsSupported(value: string): value is SupportedConnectorType {
  return SUPPORTED_CONNECTOR_TYPES.includes(value as SupportedConnectorType);
}

const DISCOVERY_INTERVAL_MS = 4 * 60 * 60_000;
let discoveryRunning = false;

const CAPABILITY_ROUTES = [
  {
    route: "Azyume Studio",
    serviceFamily: "Video Production",
    category: "Video Editing",
    keywords: [
      "video edit",
      "video editor",
      "youtube",
      "shorts",
      "reels",
      "tiktok",
      "motion graphic",
      "podcast edit",
      "subtitle",
      "caption",
    ],
  },
  {
    route: "Website Master Platform",
    serviceFamily: "Software Development",
    category: "Website Development",
    keywords: [
      "web developer",
      "website",
      "next.js",
      "nextjs",
      "react",
      "ecommerce",
      "e-commerce",
      "landing page",
      "wordpress",
    ],
  },
  {
    route: "DagangOS Custom Automation",
    serviceFamily: "Automation",
    category: "Workflow Automation",
    keywords: [
      "automation",
      "n8n",
      "workflow",
      "api integration",
      "zapier",
      "make.com",
      "ai agent",
    ],
  },
  {
    route: "DagangOS Business Systems",
    serviceFamily: "Business Software",
    category: "Custom Business System",
    keywords: [
      "point of sale",
      "pos system",
      "inventory",
      "restaurant system",
      "rental system",
      "construction software",
      "erp",
      "crm",
    ],
  },
] as const;

function stripHtml(value: string) {
  const cleaned = value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const repaired = cleaned.replace(/[\u0080-\u00ff]{2,}/g, (segment) => {
    try {
      return decoder.decode(
        Uint8Array.from(segment, (character) => character.charCodeAt(0)),
      );
    } catch {
      return segment;
    }
  });
  return repaired.slice(0, 30_000);
}

function parseSalary(value?: string) {
  if (!value) return {};
  const numbers = [...value.matchAll(/(?:USD|\$)?\s*([\d,.]+)/gi)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);
  if (!numbers.length) return {};
  return {
    budgetMin: Math.min(...numbers),
    budgetMax: Math.max(...numbers),
    currency: /€|EUR/i.test(value) ? "EUR" : /£|GBP/i.test(value) ? "GBP" : "USD",
  };
}

function routeOpportunity(opportunity: CanonicalOpportunity) {
  const text = `${opportunity.title} ${opportunity.description} ${opportunity.category || ""}`.toLowerCase();
  let best:
    | (typeof CAPABILITY_ROUTES)[number]
    | undefined;
  let bestMatches = 0;
  for (const route of CAPABILITY_ROUTES) {
    const matches = route.keywords.filter((keyword) => text.includes(keyword)).length;
    if (matches > bestMatches) {
      best = route;
      bestMatches = matches;
    }
  }
  return { route: best, matches: bestMatches };
}

function scoreOpportunity(opportunity: CanonicalOpportunity): OpportunityScores {
  const routed = routeOpportunity(opportunity);
  const legitimacyScore = opportunity.sourceUrl.startsWith("https://") ? 88 : 55;
  const capabilityScore = routed.route
    ? Math.min(95, 68 + routed.matches * 9)
    : 30;
  const statedBudget = opportunity.budgetMax || opportunity.budgetMin || 0;
  const profitabilityScore = statedBudget
    ? Math.min(95, statedBudget >= 1_000 ? 90 : statedBudget >= 300 ? 75 : 55)
    : routed.route
      ? 58
      : 35;
  const riskFlags: string[] = [];
  if (!statedBudget) riskFlags.push("Budget not stated");
  if (opportunity.description.length < 120)
    riskFlags.push("Brief contains limited detail");
  const riskScore = Math.min(100, 15 + riskFlags.length * 12);
  const score = Math.round(
    legitimacyScore * 0.25 +
      capabilityScore * 0.4 +
      profitabilityScore * 0.25 +
      (100 - riskScore) * 0.1,
  );
  return {
    score,
    legitimacyScore,
    capabilityScore,
    profitabilityScore,
    riskScore,
    productRoute: routed.route?.route || "Opportunity Gap Radar",
    routeDecision: routed.route
      ? capabilityScore >= 75
        ? "DIRECT_FULFILMENT"
        : "CUSTOM_QUOTE"
      : "PRODUCT_RESEARCH",
    serviceFamily: routed.route?.serviceFamily || "Unclassified",
    category: routed.route?.category || opportunity.category || "Unclassified",
    requiredSkills: routed.route
      ? routed.route.keywords.filter((keyword) =>
          `${opportunity.title} ${opportunity.description}`.toLowerCase().includes(keyword),
        )
      : [],
    riskFlags,
    breakdown: {
      sourceLegitimacy: legitimacyScore,
      capabilityFit: capabilityScore,
      profitability: profitabilityScore,
      commercialRisk: riskScore,
      keywordMatches: routed.matches,
    },
  };
}

function campaignAllows(
  opportunity: CanonicalOpportunity,
  campaigns: Array<{
    keywords: unknown;
    excludedKeywords: unknown;
    minimumBudget: unknown;
  }>,
) {
  if (!campaigns.length) return true;
  const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  return campaigns.some((campaign) => {
    const keywords = Array.isArray(campaign.keywords)
      ? campaign.keywords.map(String).map((value) => value.toLowerCase())
      : [];
    const excluded = Array.isArray(campaign.excludedKeywords)
      ? campaign.excludedKeywords.map(String).map((value) => value.toLowerCase())
      : [];
    if (excluded.some((keyword) => text.includes(keyword))) return false;
    if (keywords.length && !keywords.some((keyword) => text.includes(keyword)))
      return false;
    const minimumBudget = Number(campaign.minimumBudget || 0);
    const statedBudget = opportunity.budgetMax || opportunity.budgetMin || 0;
    return !minimumBudget || !statedBudget || statedBudget >= minimumBudget;
  });
}

async function fetchRemotive(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.hostname !== "remotive.com")
    throw new Error("Remotive connector endpoint must use https://remotive.com");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "DagangOS-Opportunity-Engine/1.0 (+https://bot.azharinoyume.cloud)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Remotive API returned ${response.status}`);
  const payload = (await response.json()) as RemotiveResponse;
  return normalizeRemotiveJobs(payload.jobs || []);
}

export function normalizeRemotiveJobs(jobs: RemotiveJob[]) {
  return jobs.slice(0, 100).flatMap((job) => {
    if (!job.id || !job.url || !job.title) return [];
    const salary = parseSalary(job.salary);
    return [
      {
        externalId: String(job.id),
        title: job.title.slice(0, 500),
        description: stripHtml(job.description || ""),
        sourceUrl: job.url,
        source: "remotive",
        category: job.category,
        location: job.candidate_required_location,
        engagementModel: job.job_type,
        publishedAt: job.publication_date,
        attribution: "Remotive",
        ...salary,
      } satisfies CanonicalOpportunity,
    ];
  });
}

async function fetchRemoteOk(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.hostname !== "remoteok.com")
    throw new Error("Remote OK connector endpoint must use https://remoteok.com");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "DagangOS-Opportunity-Engine/1.0 (+https://bot.azharinoyume.cloud)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Remote OK API returned ${response.status}`);
  const payload = (await response.json()) as RemoteOkJob[];
  if (!Array.isArray(payload)) throw new Error("Remote OK returned an invalid response");
  return normalizeRemoteOkJobs(payload);
}

export function normalizeRemoteOkJobs(jobs: RemoteOkJob[]) {
  return jobs.slice(0, 101).flatMap((job) => {
    const sourceUrl = job.url || job.apply_url;
    if (!job.id || !sourceUrl || !job.position) return [];
    return [
      {
        externalId: String(job.id),
        title: job.position.slice(0, 500),
        description: stripHtml(job.description || ""),
        sourceUrl,
        source: "remoteok",
        category: job.tags?.join(", "),
        location: job.location,
        engagementModel: job.tags?.find((tag) => /full.?time|part.?time|contract/i.test(tag)),
        budgetMin: job.salary_min || undefined,
        budgetMax: job.salary_max || undefined,
        currency: job.salary_min || job.salary_max ? "USD" : undefined,
        publishedAt:
          job.date || (job.epoch ? new Date(job.epoch * 1_000).toISOString() : undefined),
        attribution: "Remote OK",
      } satisfies CanonicalOpportunity,
    ];
  }).slice(0, 100);
}

async function fetchHimalayas(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.hostname !== "himalayas.app")
    throw new Error("Himalayas connector endpoint must use https://himalayas.app");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "DagangOS-Opportunity-Engine/1.0 (+https://bot.azharinoyume.cloud)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Himalayas API returned ${response.status}`);
  const payload = (await response.json()) as HimalayasResponse;
  if (!Array.isArray(payload.jobs)) throw new Error("Himalayas returned an invalid response");
  return normalizeHimalayasJobs(payload.jobs);
}

export function normalizeHimalayasJobs(jobs: HimalayasJob[]) {
  return jobs.flatMap((job) => {
    if (!job.guid || !job.applicationLink || !job.title) return [];
    return [
      {
        externalId: job.guid,
        title: job.title.slice(0, 500),
        description: stripHtml(job.description || job.excerpt || ""),
        sourceUrl: job.applicationLink,
        source: "himalayas",
        category: [...(job.parentCategories || []), ...(job.categories || [])].join(", "),
        location:
          job.locationRestrictions
            ?.map((location) =>
              typeof location === "string"
                ? location
                : location.name || location.alpha2 || location.slug || "",
            )
            .filter(Boolean)
            .join(", ") || "Worldwide / remote",
        engagementModel: job.employmentType,
        budgetMin: job.minSalary || undefined,
        budgetMax: job.maxSalary || undefined,
        currency: job.currency || undefined,
        publishedAt: job.pubDate
          ? new Date(job.pubDate > 1_000_000_000_000 ? job.pubDate : job.pubDate * 1_000).toISOString()
          : undefined,
        attribution: "Himalayas",
      } satisfies CanonicalOpportunity,
    ];
  });
}

function configurationObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function fetchConnectorOpportunities(
  connectorType: string,
  configuration: unknown,
) {
  const config = configurationObject(configuration);
  switch (connectorType) {
    case "remotive_api":
      return fetchRemotive(
        String(config.endpoint || "https://remotive.com/api/remote-jobs?limit=100"),
      );
    case "remoteok_api":
      return fetchRemoteOk(String(config.endpoint || "https://remoteok.com/api"));
    case "himalayas_api":
      return fetchHimalayas(
        String(config.endpoint || "https://himalayas.app/jobs/api?limit=20&offset=0"),
      );
    default:
      throw new Error(`Connector adapter is not implemented: ${connectorType}`);
  }
}

async function saveOpportunity(
  connectorId: string,
  opportunity: CanonicalOpportunity,
) {
  const scores = scoreOpportunity(opportunity);
  const data = {
    connectorId,
    source: opportunity.source,
    sourceUrl: opportunity.sourceUrl,
    title: opportunity.title,
    description: opportunity.description,
    industry: null,
    serviceFamily: scores.serviceFamily,
    category: scores.category,
    subcategory: opportunity.category,
    deliverables: [] as string[],
    requiredSkills: scores.requiredSkills,
    location: opportunity.location,
    language: "en",
    engagementModel: opportunity.engagementModel,
    budgetType: opportunity.budgetMin || opportunity.budgetMax ? "stated" : "unknown",
    budgetMin: opportunity.budgetMin,
    budgetMax: opportunity.budgetMax,
    currency: opportunity.currency,
    deadline: null,
    score: scores.score,
    legitimacyScore: scores.legitimacyScore,
    capabilityScore: scores.capabilityScore,
    profitabilityScore: scores.profitabilityScore,
    riskScore: scores.riskScore,
    productRoute: scores.productRoute,
    routeDecision: scores.routeDecision,
    riskFlags: scores.riskFlags,
    policyStatus: "approved_source",
    scoreBreakdown: scores.breakdown as Prisma.InputJsonValue,
    pipelineStatus: scores.score >= 65 ? "scored" : "new_lead",
    rawSnapshot: {
      ...opportunity,
      attribution: opportunity.attribution,
      collectedAt: new Date().toISOString(),
    } as unknown as Prisma.InputJsonValue,
  };
  const existing = await prisma.jobLead.findUnique({
    where: {
      source_externalId: {
        source: opportunity.source,
        externalId: opportunity.externalId,
      },
    },
  });
  if (existing) {
    await prisma.jobLead.update({
      where: { id: existing.id },
      data: { ...data, externalId: opportunity.externalId },
    });
    return "updated";
  }
  await prisma.jobLead.create({
    data: { ...data, externalId: opportunity.externalId },
  });
  return "created";
}

export async function bootstrapOpportunityEngine() {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(487965321)`;

    await transaction.sourceConnector.upsert({
      where: { name: "Remotive Public API" },
      create: {
        name: "Remotive Public API",
        connectorType: "remotive_api",
        collectionMethod: "public_api",
        permissionMethod: "published_public_api_terms",
        policyStatus: "approved",
        health: "healthy",
        authStatus: "not_required",
        enabled: true,
        allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
        retentionDays: 90,
        rateLimit: { minimumIntervalMinutes: 240, maximumJobsPerRun: 100 },
        configuration: {
          endpoint: "https://remotive.com/api/remote-jobs?limit=100",
          attributionRequired: true,
        },
      },
      update: {
        connectorType: "remotive_api",
        collectionMethod: "public_api",
        permissionMethod: "published_public_api_terms",
        policyStatus: "approved",
        authStatus: "not_required",
        allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
        retentionDays: 90,
        rateLimit: { minimumIntervalMinutes: 240, maximumJobsPerRun: 100 },
        configuration: {
          endpoint: "https://remotive.com/api/remote-jobs?limit=100",
          attributionRequired: true,
        },
      },
    });

    for (const [name, connectorType, endpoint, retentionDays, maximumJobsPerRun] of [
      ["Remote OK Public API", "remoteok_api", "https://remoteok.com/api", 90, 100],
      ["Himalayas Public API", "himalayas_api", "https://himalayas.app/jobs/api?limit=20&offset=0", 90, 20],
    ] as const) {
      await transaction.sourceConnector.upsert({
        where: { name },
        create: {
          name,
          connectorType,
          collectionMethod: "public_api",
          permissionMethod: "published_public_api_terms",
          policyStatus: "approved",
          health: "healthy",
          authStatus: "not_required",
          enabled: true,
          allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
          retentionDays,
          rateLimit: { minimumIntervalMinutes: connectorType === "himalayas_api" ? 1440 : 240, maximumJobsPerRun },
          configuration: { endpoint, attributionRequired: true },
        },
        update: {
          connectorType,
          collectionMethod: "public_api",
          permissionMethod: "published_public_api_terms",
          policyStatus: "approved",
          authStatus: "not_required",
          allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
          retentionDays,
          rateLimit: { minimumIntervalMinutes: connectorType === "himalayas_api" ? 1440 : 240, maximumJobsPerRun },
          configuration: { endpoint, attributionRequired: true },
        },
      });
    }

    const unavailableNames = ["Upwork", "Indeed", "Fiverr"];
    await transaction.sourceConnector.updateMany({
      where: { name: { in: unavailableNames } },
      data: {
        enabled: false,
        health: "unavailable",
        policyStatus: "access_required",
        authStatus: "not_connected",
      },
    });
    await transaction.sourceConnector.deleteMany({
      where: { name: { in: unavailableNames }, leads: { none: {} } },
    });

    const campaignCount = await transaction.searchCampaign.count();
    if (!campaignCount) {
      await transaction.searchCampaign.create({
        data: {
          name: "DagangOS supported opportunities",
          enabled: true,
          categories: [
            "video editing",
            "website development",
            "automation",
            "business software",
          ],
          keywords: [
            "video",
            "youtube",
            "website",
            "web developer",
            "automation",
            "n8n",
            "software",
            "api",
            "ecommerce",
            "content",
          ],
          excludedKeywords: [
            "unpaid",
            "volunteer only",
            "commission only",
            "adult content",
          ],
          locations: ["worldwide", "remote"],
          languages: ["en"],
          sources: ["remotive", "remoteok", "himalayas"],
          productRoutes: CAPABILITY_ROUTES.map((route) => route.route),
          minimumMargin: 20,
          schedule: "every 4 hours",
        },
      });
    }
  });
}

export async function runOpportunityDiscovery(options?: { force?: boolean }) {
  if (discoveryRunning) return { skipped: true, reason: "already_running" };
  discoveryRunning = true;
  try {
    await bootstrapOpportunityEngine();
    const [connectors, campaigns] = await Promise.all([
      prisma.sourceConnector.findMany({
        where: { enabled: true, policyStatus: "approved" },
      }),
      prisma.searchCampaign.findMany({ where: { enabled: true } }),
    ]);
    let created = 0;
    let updated = 0;
    let rejected = 0;
    let fetched = 0;
    const errors: Array<{ connector: string; error: string }> = [];

    for (const connector of connectors) {
      if (
        !options?.force &&
        connector.lastRunAt &&
        Date.now() - connector.lastRunAt.getTime() < DISCOVERY_INTERVAL_MS
      )
        continue;
      await prisma.sourceConnector.update({
        where: { id: connector.id },
        data: { lastRunAt: new Date(), health: "running" },
      });
      try {
        if (!connectorTypeIsSupported(connector.connectorType))
          throw new Error(`Enabled connector has no production adapter: ${connector.connectorType}`);
        const opportunities = await fetchConnectorOpportunities(
          connector.connectorType,
          connector.configuration,
        );
        fetched += opportunities.length;
        for (const opportunity of opportunities) {
          if (!campaignAllows(opportunity, campaigns)) {
            rejected += 1;
            continue;
          }
          const result = await saveOpportunity(connector.id, opportunity);
          if (result === "created") created += 1;
          else updated += 1;
        }
        await prisma.sourceConnector.update({
          where: { id: connector.id },
          data: {
            health: "healthy",
            lastSuccessAt: new Date(),
            errorRate: 0,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message.slice(0, 1_000) : "Connector failed";
        errors.push({ connector: connector.name, error: message });
        await prisma.sourceConnector.update({
          where: { id: connector.id },
          data: { health: "failed", errorRate: 100 },
        });
      }
    }

    await prisma.searchCampaign.updateMany({
      where: { enabled: true },
      data: { lastRunAt: new Date() },
    });
    return { skipped: false, fetched, created, updated, rejected, errors };
  } finally {
    discoveryRunning = false;
  }
}

export async function testSourceConnector(connectorId: string) {
  const connector = await prisma.sourceConnector.findUnique({ where: { id: connectorId } });
  if (!connector) throw new Error("Source connector not found");
  if (connector.policyStatus !== "approved")
    throw new Error("Source connector policy is not approved");
  if (!connectorTypeIsSupported(connector.connectorType))
    throw new Error(`No production adapter exists for ${connector.name}`);
  const startedAt = Date.now();
  await prisma.sourceConnector.update({
    where: { id: connector.id },
    data: { health: "testing", lastRunAt: new Date() },
  });
  try {
    const opportunities = await fetchConnectorOpportunities(
      connector.connectorType,
      connector.configuration,
    );
    await prisma.sourceConnector.update({
      where: { id: connector.id },
      data: { health: "healthy", lastSuccessAt: new Date(), errorRate: 0 },
    });
    return {
      connector: connector.name,
      fetched: opportunities.length,
      latencyMs: Date.now() - startedAt,
      sampleTitle: opportunities[0]?.title || null,
    };
  } catch (error) {
    await prisma.sourceConnector.update({
      where: { id: connector.id },
      data: { health: "failed", errorRate: 100 },
    });
    throw error;
  }
}

export async function runScheduledOpportunityDiscovery() {
  return runOpportunityDiscovery({ force: false });
}

export async function generateOpportunityProposal(
  leadId: string,
  adminId: string,
) {
  const lead = await prisma.jobLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Opportunity not found");
  if ((Number(lead.capabilityScore) || 0) < 60)
    throw new Error("Opportunity does not meet the capability threshold");
  if (lead.policyStatus !== "approved_source" && lead.source !== "manual")
    throw new Error("Source policy approval is required");

  const prompt = `Draft a concise, truthful proposal for this opportunity.

Title: ${lead.title}
Description: ${lead.description || "Not supplied"}
Budget: ${lead.currency || "USD"} ${lead.budgetMin || "?"}-${lead.budgetMax || "?"}
Product route: ${lead.productRoute || "DagangOS"}
Category: ${lead.category || "Unclassified"}
Required skills: ${JSON.stringify(lead.requiredSkills)}

Rules:
- Do not claim experience, staff, portfolio, certifications, or capabilities that are not stated above.
- Ask one useful clarification question when the brief is incomplete.
- Do not imply that this proposal has been submitted.
- Keep it under 220 words.`;
  const draftText = await callClaude(prompt, {
    purpose: "opportunity_proposal",
    usePremium: false,
    systemPrompt:
      "You write grounded commercial proposals without invented claims.",
  });
  const proposal = await prisma.proposalDraft.create({
    data: {
      jobLeadId: lead.id,
      draftText,
      aiModel: process.env.ANTHROPIC_MODEL_CHEAP || "configured-cheap-model",
      adminId,
      status: "draft",
    },
  });
  await prisma.jobLead.update({
    where: { id: lead.id },
    data: { pipelineStatus: "proposal_drafted" },
  });
  return proposal;
}
