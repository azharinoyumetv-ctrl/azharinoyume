export type CanonicalOpportunity = {
  externalId: string;
  title: string;
  description: string;
  sourceUrl: string;
  source: string;
  category?: string;
  location?: string;
  language?: string;
  engagementModel?: string;
  budgetType?: "project" | "hourly" | "salary" | "unknown";
  budgetPeriod?: "project" | "hour" | "month" | "year" | "unknown";
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  publishedAt?: string;
  attribution: string;
};

export type OpportunityScores = {
  score: number;
  legitimacyScore: number;
  capabilityScore: number;
  profitabilityScore: number;
  riskScore: number;
  productRoute: string;
  routeDecision: "DIRECT_FULFILMENT" | "CUSTOM_QUOTE" | "PRODUCT_RESEARCH";
  serviceFamily: string;
  category: string;
  requiredSkills: string[];
  keywords: string[];
  riskFlags: string[];
  breakdown: Record<string, number | string | boolean>;
};

export const OPPORTUNITY_CATEGORIES = [
  "Video Editing",
  "Web Development",
  "Automation",
  "Business Systems",
  "Software Engineering",
  "DevOps & Infrastructure",
  "Data & AI",
  "Design",
  "Marketing",
  "Sales",
  "Customer Support",
  "Operations",
  "Finance & Accounting",
  "Legal",
  "Healthcare",
  "Other",
] as const;

type CategoryRule = {
  category: (typeof OPPORTUNITY_CATEGORIES)[number];
  serviceFamily: string;
  patterns: RegExp[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "DevOps & Infrastructure",
    serviceFamily: "Infrastructure & Cloud",
    patterns: [
      /\bdevops\b/i,
      /\bsite reliability\b|\bsre\b/i,
      /\bplatform engineer/i,
      /\bcloud engineer/i,
      /\binfrastructure engineer/i,
      /\bkubernetes\b|\bterraform\b/i,
    ],
  },
  {
    category: "Video Editing",
    serviceFamily: "Video Production",
    patterns: [
      /\bvideo editor|video editing|post[- ]production\b/i,
      /\bmotion graphic/i,
      /\bpodcast editor/i,
      /\byoutube editor|reels editor|shorts editor|tiktok editor/i,
    ],
  },
  {
    category: "Web Development",
    serviceFamily: "Software Development",
    patterns: [
      /\bweb developer|website developer|frontend developer|front[- ]end developer/i,
      /\bwordpress|shopify|webflow|woocommerce|drupal developer/i,
      /\bweb designer|landing page developer/i,
    ],
  },
  {
    category: "Automation",
    serviceFamily: "Automation",
    patterns: [
      /\bautomation (engineer|developer|specialist|consultant)/i,
      /\bworkflow automation|n8n|zapier|make\.com/i,
      /\bintegration engineer/i,
    ],
  },
  {
    category: "Business Systems",
    serviceFamily: "Business Software",
    patterns: [
      /\b(erp|crm|pos) (developer|consultant|specialist|implementation)/i,
      /\binventory system|restaurant system|rental system/i,
      /\bbusiness systems analyst/i,
    ],
  },
  {
    category: "Data & AI",
    serviceFamily: "Data & Artificial Intelligence",
    patterns: [
      /\bdata scientist|data engineer|data analyst/i,
      /\bmachine learning|ml engineer|ai engineer|llm engineer/i,
      /\bbusiness intelligence|analytics engineer/i,
    ],
  },
  {
    category: "Software Engineering",
    serviceFamily: "Software Development",
    patterns: [
      /\bsoftware engineer|software developer/i,
      /\bbackend developer|back[- ]end developer/i,
      /\bfull[- ]?stack (engineer|developer)/i,
      /\bmobile developer|ios developer|android developer/i,
      /\bqa engineer|test engineer/i,
    ],
  },
  {
    category: "Design",
    serviceFamily: "Creative Design",
    patterns: [/\bgraphic designer|product designer|ui\/ux|ux designer|illustrator/i],
  },
  {
    category: "Marketing",
    serviceFamily: "Marketing",
    patterns: [/\bmarketing|seo specialist|content strategist|social media manager|copywriter/i],
  },
  {
    category: "Sales",
    serviceFamily: "Sales",
    patterns: [/\bsales|account executive|business development|sales development/i],
  },
  {
    category: "Customer Support",
    serviceFamily: "Customer Operations",
    patterns: [/\bcustomer support|customer success|support specialist|helpdesk/i],
  },
  {
    category: "Finance & Accounting",
    serviceFamily: "Finance",
    patterns: [/\baccountant|bookkeep|financial analyst|controller|auditor/i],
  },
  {
    category: "Legal",
    serviceFamily: "Legal",
    patterns: [/\blegal|lawyer|attorney|paralegal|counsel/i],
  },
  {
    category: "Healthcare",
    serviceFamily: "Healthcare",
    patterns: [/\bhealthcare|medical|nurse|physician|clinical/i],
  },
  {
    category: "Operations",
    serviceFamily: "Business Operations",
    patterns: [/\boperations|project manager|program manager|virtual assistant|administrator/i],
  },
];

const KEYWORD_RULES: Array<[string, RegExp]> = [
  ["video editing", /video edit|post[- ]production/i],
  ["motion graphics", /motion graphic|after effects/i],
  ["YouTube", /youtube/i],
  ["short-form video", /tiktok|reels|shorts/i],
  ["React", /\breact(?:\.js)?\b/i],
  ["Next.js", /\bnext\.?js\b/i],
  ["WordPress", /\bwordpress\b/i],
  ["Shopify", /\bshopify\b/i],
  ["Node.js", /\bnode\.?js\b/i],
  ["Python", /\bpython\b/i],
  ["AWS", /\baws\b|amazon web services/i],
  ["Azure", /\bazure\b/i],
  ["GCP", /\bgcp\b|google cloud/i],
  ["Kubernetes", /\bkubernetes\b|\bk8s\b/i],
  ["Docker", /\bdocker\b/i],
  ["Terraform", /\bterraform\b/i],
  ["CI/CD", /\bci\/cd\b|continuous integration/i],
  ["n8n", /\bn8n\b/i],
  ["Zapier", /\bzapier\b/i],
  ["API integration", /api integration|systems integration/i],
  ["AI/ML", /machine learning|artificial intelligence|\bllm\b|\bai\b/i],
  ["SQL", /\bsql\b|postgres|mysql/i],
  ["SEO", /\bseo\b/i],
  ["CRM", /\bcrm\b/i],
  ["ERP", /\berp\b/i],
  ["remote", /\bremote\b/i],
];

const SOURCE_TRUST: Record<string, number> = {
  remotive: 20,
  remoteok: 18,
  himalayas: 20,
  rss: 12,
  email_alert: 10,
  manual: 8,
};

function compact(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

export function normalizeJobType(value?: string) {
  const text = compact(value).toLowerCase();
  if (!text) return "Not specified";
  if (/full.?time|permanent/.test(text)) return "Full-time";
  if (/part.?time/.test(text)) return "Part-time";
  if (/freelance/.test(text)) return "Freelance";
  if (/contract|temporary|temp\b/.test(text)) return "Contract";
  if (/intern/.test(text)) return "Internship";
  return compact(value).slice(0, 80);
}

export function extractOpportunityKeywords(opportunity: CanonicalOpportunity) {
  const text = `${opportunity.title} ${opportunity.description} ${opportunity.category || ""}`;
  return KEYWORD_RULES.filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label)
    .slice(0, 12);
}

export function classifyOpportunity(opportunity: CanonicalOpportunity) {
  const primaryText = `${opportunity.title} ${opportunity.category || ""}`;
  const match = CATEGORY_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(primaryText)),
  );
  return {
    category: match?.category || "Other",
    serviceFamily: match?.serviceFamily || "Unclassified",
  };
}

function determineProductRoute(
  opportunity: CanonicalOpportunity,
  category: string,
) {
  const description = opportunity.description;
  const directByCategory: Record<
    string,
    { route: string; requiredSkills: string[] }
  > = {
    "Video Editing": {
      route: "Azyume Studio",
      requiredSkills: ["video editing"],
    },
    "Web Development": {
      route: "Website Master Platform",
      requiredSkills: ["web development"],
    },
    Automation: {
      route: "DagangOS Custom Automation",
      requiredSkills: ["workflow automation"],
    },
    "Business Systems": {
      route: "DagangOS Business Systems",
      requiredSkills: ["business systems"],
    },
  };
  const direct = directByCategory[category];
  if (direct) {
    return { ...direct, routeDecision: "DIRECT_FULFILMENT" as const, evidence: "title_or_source_category" };
  }

  const customPatterns: Array<{
    route: string;
    requiredSkills: string[];
    pattern: RegExp;
  }> = [
    {
      route: "Azyume Studio",
      requiredSkills: ["video editing"],
      pattern: /deliver(?:able)?s?.{0,50}(video edit|edited video)|need.{0,30}video edit/i,
    },
    {
      route: "Website Master Platform",
      requiredSkills: ["web development"],
      pattern: /build|create|redesign.{0,40}(website|landing page|online store)/i,
    },
    {
      route: "DagangOS Custom Automation",
      requiredSkills: ["workflow automation"],
      pattern: /automate.{0,60}(workflow|business process)|build.{0,30}(n8n|zapier) workflow/i,
    },
    {
      route: "DagangOS Business Systems",
      requiredSkills: ["business systems"],
      pattern: /implement|build|customize.{0,40}(erp|crm|pos|inventory system)/i,
    },
  ];
  const custom = customPatterns.find((candidate) => candidate.pattern.test(description));
  if (custom && !/DevOps & Infrastructure|Legal|Healthcare/.test(category)) {
    return { ...custom, routeDecision: "CUSTOM_QUOTE" as const, evidence: "explicit_description_deliverable" };
  }

  return {
    route: "Opportunity Gap Radar",
    requiredSkills: [] as string[],
    routeDecision: "PRODUCT_RESEARCH" as const,
    evidence: "no_verified_product_capability",
  };
}

export function scoreOpportunity(opportunity: CanonicalOpportunity): OpportunityScores {
  const classification = classifyOpportunity(opportunity);
  const routing = determineProductRoute(opportunity, classification.category);
  const keywords = extractOpportunityKeywords(opportunity);

  let legitimacyScore = 45;
  if (opportunity.sourceUrl.startsWith("https://")) legitimacyScore += 10;
  if (opportunity.title.length >= 6) legitimacyScore += 8;
  if (opportunity.description.length >= 120) legitimacyScore += 10;
  if (opportunity.location) legitimacyScore += 4;
  legitimacyScore += SOURCE_TRUST[opportunity.source] || (opportunity.source.startsWith("rss_") ? 12 : 6);
  legitimacyScore = Math.min(96, legitimacyScore);

  const capabilityScore =
    routing.routeDecision === "DIRECT_FULFILMENT"
      ? 88
      : routing.routeDecision === "CUSTOM_QUOTE"
        ? 62
        : 28;

  const statedBudget = opportunity.budgetMax || opportunity.budgetMin || 0;
  let profitabilityScore = 40;
  if (opportunity.budgetType === "salary") profitabilityScore = statedBudget ? 52 : 40;
  else if (statedBudget >= 1_000) profitabilityScore = 82;
  else if (statedBudget >= 300) profitabilityScore = 68;
  else if (statedBudget > 0) profitabilityScore = 50;

  const riskFlags: string[] = [];
  let riskScore = 8;
  if (!statedBudget) {
    riskFlags.push("Budget not stated");
    riskScore += 8;
  }
  if (opportunity.description.length < 120) {
    riskFlags.push("Brief contains limited detail");
    riskScore += 18;
  }
  if (!opportunity.sourceUrl.startsWith("https://")) {
    riskFlags.push("Source link is not HTTPS");
    riskScore += 25;
  }
  const text = `${opportunity.title} ${opportunity.description}`;
  if (/unpaid|volunteer only|commission only/i.test(text)) {
    riskFlags.push("Unpaid or commission-only language detected");
    riskScore += 35;
  }
  if (/telegram only|whatsapp only|pay.{0,20}(fee|deposit)|crypto payment required/i.test(text)) {
    riskFlags.push("Potential scam signal detected");
    riskScore += 40;
  }
  riskScore = Math.min(100, riskScore);

  const score = Math.round(
    legitimacyScore * 0.3 +
      capabilityScore * 0.35 +
      profitabilityScore * 0.2 +
      (100 - riskScore) * 0.15,
  );

  return {
    score,
    legitimacyScore,
    capabilityScore,
    profitabilityScore,
    riskScore,
    productRoute: routing.route,
    routeDecision: routing.routeDecision,
    serviceFamily: classification.serviceFamily,
    category: classification.category,
    requiredSkills: routing.requiredSkills,
    keywords,
    riskFlags,
    breakdown: {
      sourceLegitimacy: legitimacyScore,
      capabilityFit: capabilityScore,
      commercialValue: profitabilityScore,
      commercialRisk: riskScore,
      routeEvidence: routing.evidence,
      budgetPeriod: opportunity.budgetPeriod || "unknown",
      salaryIsNotProjectMargin: opportunity.budgetType === "salary",
    },
  };
}

type CampaignInput = {
  categories: unknown;
  keywords: unknown;
  excludedKeywords: unknown;
  locations: unknown;
  languages: unknown;
  sources: unknown;
  productRoutes: unknown;
  jobTypes?: unknown;
  minimumBudget: unknown;
};

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim().toLowerCase()).filter(Boolean)
    : [];
}

export function campaignAllows(
  opportunity: CanonicalOpportunity,
  campaigns: CampaignInput[],
) {
  if (!campaigns.length) return true;
  const scores = scoreOpportunity(opportunity);
  const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const jobType = normalizeJobType(opportunity.engagementModel).toLowerCase();
  return campaigns.some((campaign) => {
    const keywords = stringList(campaign.keywords);
    const excluded = stringList(campaign.excludedKeywords);
    const categories = stringList(campaign.categories);
    const locations = stringList(campaign.locations);
    const languages = stringList(campaign.languages);
    const sources = stringList(campaign.sources);
    const routes = stringList(campaign.productRoutes);
    const jobTypes = stringList(campaign.jobTypes);

    if (excluded.some((keyword) => text.includes(keyword))) return false;
    if (keywords.length && !keywords.some((keyword) => text.includes(keyword))) return false;
    if (categories.length && !categories.includes(scores.category.toLowerCase())) return false;
    if (locations.length && !locations.some((location) => (opportunity.location || "").toLowerCase().includes(location))) return false;
    if (languages.length && !languages.includes((opportunity.language || "en").toLowerCase())) return false;
    if (sources.length && !sources.includes(opportunity.source.toLowerCase())) return false;
    if (routes.length && !routes.includes(scores.productRoute.toLowerCase())) return false;
    if (jobTypes.length && !jobTypes.includes(jobType)) return false;

    const minimumBudget = Number(campaign.minimumBudget || 0);
    const statedBudget = opportunity.budgetMax || opportunity.budgetMin || 0;
    if (minimumBudget && (!statedBudget || statedBudget < minimumBudget)) return false;
    return true;
  });
}
