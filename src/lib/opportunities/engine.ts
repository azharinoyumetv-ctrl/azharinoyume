import { Prisma } from "@/generated/prisma/client";
import { callClaude } from "@/lib/ai/claude";
import { prisma } from "@/lib/prisma";

type CanonicalOpportunity = {
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
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
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
  return (payload.jobs || []).slice(0, 100).flatMap((job) => {
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
        ...salary,
      } satisfies CanonicalOpportunity,
    ];
  });
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
      attribution: "Remotive",
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
      update: {},
    });

    for (const [name, connectorType, permissionMethod] of [
      ["Upwork", "official_api", "official_api_approval_required"],
      ["Indeed", "partner_feed", "partner_or_publisher_access_required"],
      ["Fiverr", "manual_alert", "manual_or_official_access_required"],
    ] as const) {
      await transaction.sourceConnector.upsert({
        where: { name },
        create: {
          name,
          connectorType,
          collectionMethod: "disabled_until_authorized",
          permissionMethod,
          policyStatus: "review_required",
          health: "disabled",
          authStatus: "not_connected",
          enabled: false,
          allowedActions: ["manual_intake"],
          configuration: {},
        },
        update: {},
      });
    }

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
          sources: ["remotive"],
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
        const configuration =
          connector.configuration &&
          typeof connector.configuration === "object" &&
          !Array.isArray(connector.configuration)
            ? (connector.configuration as Record<string, unknown>)
            : {};
        const opportunities =
          connector.connectorType === "remotive_api"
            ? await fetchRemotive(
                String(
                  configuration.endpoint ||
                    "https://remotive.com/api/remote-jobs?limit=100",
                ),
              )
            : [];
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
