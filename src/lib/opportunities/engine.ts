import { Prisma } from "@/generated/prisma/client";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { XMLParser } from "fast-xml-parser";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { callClaude } from "@/lib/ai/claude";
import { prisma } from "@/lib/prisma";
import {
  campaignAllows,
  type CanonicalOpportunity,
  normalizeJobType,
  scoreOpportunity,
} from "@/lib/opportunities/classification";

export type { CanonicalOpportunity } from "@/lib/opportunities/classification";
export { campaignAllows, scoreOpportunity } from "@/lib/opportunities/classification";

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
  "rss_feed",
  "email_alerts_imap",
] as const;

export type SupportedConnectorType = (typeof SUPPORTED_CONNECTOR_TYPES)[number];

export function connectorTypeIsSupported(value: string): value is SupportedConnectorType {
  return SUPPORTED_CONNECTOR_TYPES.includes(value as SupportedConnectorType);
}

const DISCOVERY_INTERVAL_MS = 4 * 60 * 60_000;
let discoveryRunning = false;

function stripHtml(value: string) {
  const decodedHtml = value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const repaired = decodedHtml.replace(/[\u0080-\u00ff]{2,}/g, (segment) => {
    try {
      return decoder.decode(
        Uint8Array.from(segment, (character) => character.charCodeAt(0)),
      );
    } catch {
      return segment;
    }
  });
  return repaired
    .replace(/\u00c2(?=\s)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
}

function parseSalary(value?: string) {
  if (!value) return {};
  const numbers = [...value.matchAll(/(?:USD|EUR|GBP|\$|€|£)?\s*([\d,.]+)\s*([km])?/gi)]
    .map((match) => {
      const base = Number(match[1].replaceAll(",", ""));
      const multiplier = match[2]?.toLowerCase() === "m" ? 1_000_000 : match[2]?.toLowerCase() === "k" ? 1_000 : 1;
      return base * multiplier;
    })
    .filter(Number.isFinite);
  if (!numbers.length) return {};
  const budgetPeriod = /per\s*hour|\/\s*h(?:ou)?r|hourly/i.test(value)
    ? "hour"
    : /per\s*month|\/\s*mo(?:nth)?|monthly/i.test(value)
      ? "month"
      : /per\s*year|\/\s*y(?:ea)?r|annual|yearly/i.test(value)
        ? "year"
        : "unknown";
  return {
    budgetMin: Math.min(...numbers),
    budgetMax: Math.max(...numbers),
    currency: /€|EUR/i.test(value) ? "EUR" : /£|GBP/i.test(value) ? "GBP" : "USD",
    budgetType: "salary" as const,
    budgetPeriod: budgetPeriod as "hour" | "month" | "year" | "unknown",
  };
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
        title: stripHtml(job.title).slice(0, 500),
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
        title: stripHtml(job.position).slice(0, 500),
        description: stripHtml(job.description || ""),
        sourceUrl,
        source: "remoteok",
        category: job.tags?.join(", "),
        location: job.location,
        engagementModel: job.tags?.find((tag) => /full.?time|part.?time|contract/i.test(tag)),
        budgetMin: job.salary_min || undefined,
        budgetMax: job.salary_max || undefined,
        currency: job.salary_min || job.salary_max ? "USD" : undefined,
        budgetType: job.salary_min || job.salary_max ? "salary" : "unknown",
        budgetPeriod: job.salary_min || job.salary_max ? "year" : "unknown",
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
        title: stripHtml(job.title).slice(0, 500),
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
        budgetType: job.minSalary || job.maxSalary ? "salary" : "unknown",
        budgetPeriod: /hour/i.test(job.salaryPeriod || "")
          ? "hour"
          : /month/i.test(job.salaryPeriod || "")
            ? "month"
            : /year|annual/i.test(job.salaryPeriod || "")
              ? "year"
              : "unknown",
        publishedAt: job.pubDate
          ? new Date(job.pubDate > 1_000_000_000_000 ? job.pubDate : job.pubDate * 1_000).toISOString()
          : undefined,
        attribution: "Himalayas",
      } satisfies CanonicalOpportunity,
    ];
  });
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 0
    );
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

async function assertPublicHttpsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("RSS feeds must use HTTPS");
  if (url.username || url.password) throw new Error("RSS feed URLs cannot contain credentials");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("RSS feed host resolves to a private or reserved address");
  }
  return url;
}

async function fetchPublicFeed(endpoint: string) {
  let url = await assertPublicHttpsUrl(endpoint);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "User-Agent": "DagangOS-Opportunity-Engine/1.0 (+https://bot.azharinoyume.cloud)",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw new Error("RSS feed redirect could not be followed safely");
      url = await assertPublicHttpsUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`RSS feed returned ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 2_000_000) throw new Error("RSS feed exceeds the 2 MB safety limit");
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > 2_000_000) throw new Error("RSS feed exceeds the 2 MB safety limit");
    return { body, finalUrl: url };
  }
  throw new Error("RSS feed could not be retrieved");
}

function arrayValue<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function xmlText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return xmlText(record["#text"] || record.__cdata || record.href || "");
  }
  return "";
}

function atomLink(value: unknown) {
  for (const link of arrayValue(value)) {
    if (typeof link === "string") return link;
    if (link && typeof link === "object") {
      const record = link as Record<string, unknown>;
      if (!record.rel || record.rel === "alternate") return xmlText(record.href || record["@_href"]);
    }
  }
  return "";
}

export function normalizeRssFeed(
  xml: string,
  options: { source: string; attribution: string; maximumJobs?: number },
) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: true });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = (parsed.rss || {}) as Record<string, unknown>;
  const channel = (rss.channel || {}) as Record<string, unknown>;
  const feed = (parsed.feed || {}) as Record<string, unknown>;
  const items = channel.item ? arrayValue(channel.item) : arrayValue(feed.entry);
  const maximumJobs = Math.min(200, Math.max(1, options.maximumJobs || 100));

  return items.slice(0, maximumJobs).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const sourceUrl = xmlText(item.link) || atomLink(item.link);
    const title = stripHtml(xmlText(item.title)).slice(0, 500);
    if (!sourceUrl.startsWith("https://") || !title) return [];
    const description = stripHtml(
      xmlText(item.description || item.summary || item.content || item["content:encoded"]),
    );
    const categories = arrayValue(item.category).map(xmlText).filter(Boolean).join(", ");
    const externalId = xmlText(item.guid || item.id) || createHash("sha256").update(sourceUrl).digest("hex");
    return [{
      externalId,
      title,
      description,
      sourceUrl,
      source: options.source,
      category: categories || undefined,
      location: xmlText(item.location || item["job:location"]) || undefined,
      engagementModel: xmlText(item.jobType || item["job:type"]) || undefined,
      publishedAt: xmlText(item.pubDate || item.published || item.updated) || undefined,
      attribution: options.attribution,
    } satisfies CanonicalOpportunity];
  });
}

async function fetchRss(configuration: Record<string, unknown>) {
  const endpoint = String(configuration.endpoint || "");
  if (!endpoint) throw new Error("RSS feed URL is not configured");
  const { body, finalUrl } = await fetchPublicFeed(endpoint);
  const source = String(configuration.sourceKey || `rss_${finalUrl.hostname.replace(/[^a-z0-9]+/gi, "_")}`).toLowerCase();
  return normalizeRssFeed(body, {
    source,
    attribution: String(configuration.attribution || finalUrl.hostname),
    maximumJobs: Number(configuration.maximumJobsPerRun || 100),
  });
}

export function normalizeEmailAlert(input: {
  messageId?: string;
  subject?: string;
  text?: string;
  html?: string;
  from?: string;
  date?: Date;
}) {
  const combined = `${input.text || ""} ${input.html || ""}`;
  const urls = [...combined.matchAll(/https:\/\/[^\s<>"']+/gi)]
    .map((match) => match[0].replace(/[).,;]+$/, ""))
    .filter((url) => !/unsubscribe|email-preferences|tracking/i.test(url));
  const sourceUrl = urls[0];
  const title = stripHtml(input.subject || "").replace(/^(new job|job alert|recommended job)s?\s*[:\-]\s*/i, "");
  if (!sourceUrl || !title) return null;
  return {
    externalId: input.messageId || createHash("sha256").update(`${title}:${sourceUrl}`).digest("hex"),
    title: title.slice(0, 500),
    description: stripHtml(input.text || input.html || ""),
    sourceUrl,
    source: "email_alert",
    publishedAt: input.date?.toISOString(),
    attribution: input.from || "Email alert",
  } satisfies CanonicalOpportunity;
}

function emailFetcherConfigured() {
  return Boolean(
    process.env.OPPORTUNITY_IMAP_HOST &&
      process.env.OPPORTUNITY_IMAP_USER &&
      process.env.OPPORTUNITY_IMAP_PASSWORD,
  );
}

async function fetchEmailAlerts(configuration: Record<string, unknown>) {
  if (!emailFetcherConfigured()) throw new Error("Email alert mailbox credentials are not configured on the server");
  const allowedDomains = Array.isArray(configuration.allowedSenderDomains)
    ? configuration.allowedSenderDomains.map(String).map((value) => value.toLowerCase())
    : [];
  const lookbackDays = Math.min(30, Math.max(1, Number(configuration.lookbackDays || 7)));
  const client = new ImapFlow({
    host: process.env.OPPORTUNITY_IMAP_HOST!,
    port: Number(process.env.OPPORTUNITY_IMAP_PORT || 993),
    secure: process.env.OPPORTUNITY_IMAP_SECURE !== "false",
    auth: {
      user: process.env.OPPORTUNITY_IMAP_USER!,
      pass: process.env.OPPORTUNITY_IMAP_PASSWORD!,
    },
    logger: false,
  });
  const results: CanonicalOpportunity[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock(String(configuration.mailbox || "INBOX"));
    try {
      const since = new Date(Date.now() - lookbackDays * 86_400_000);
      const uids = await client.search({ since }, { uid: true });
      if (!Array.isArray(uids) || !uids.length) return results;
      for await (const message of client.fetch(uids.slice(-200), { source: true }, { uid: true })) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        const from = parsed.from?.value[0]?.address || "";
        const senderDomain = from.split("@")[1]?.toLowerCase() || "";
        if (allowedDomains.length && !allowedDomains.includes(senderDomain)) continue;
        const normalized = normalizeEmailAlert({
          messageId: parsed.messageId,
          subject: parsed.subject,
          text: parsed.text,
          html: typeof parsed.html === "string" ? parsed.html : undefined,
          from,
          date: parsed.date,
        });
        if (normalized) results.push(normalized);
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return results;
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
    case "rss_feed":
      return fetchRss(config);
    case "email_alerts_imap":
      return fetchEmailAlerts(config);
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
    keywords: scores.keywords,
    location: opportunity.location,
    language: opportunity.language || "en",
    engagementModel: normalizeJobType(opportunity.engagementModel),
    budgetType: opportunity.budgetType || (opportunity.budgetMin || opportunity.budgetMax ? "project" : "unknown"),
    budgetPeriod: opportunity.budgetPeriod || "unknown",
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

    await transaction.sourceConnector.upsert({
      where: { name: "Opportunity Email Alerts" },
      create: {
        name: "Opportunity Email Alerts",
        connectorType: "email_alerts_imap",
        collectionMethod: "owner_mailbox_imap",
        permissionMethod: "owner_authorized_mailbox",
        policyStatus: "approved",
        health: "disabled",
        authStatus: emailFetcherConfigured() ? "configured" : "not_configured",
        enabled: false,
        allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
        retentionDays: 90,
        rateLimit: { minimumIntervalMinutes: 15, maximumMessagesPerRun: 200 },
        configuration: { mailbox: "INBOX", lookbackDays: 7, allowedSenderDomains: [] },
      },
      update: {
        connectorType: "email_alerts_imap",
        collectionMethod: "owner_mailbox_imap",
        permissionMethod: "owner_authorized_mailbox",
        policyStatus: "approved",
        authStatus: emailFetcherConfigured() ? "configured" : "not_configured",
        allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
      },
    });

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

    await transaction.searchCampaign.deleteMany({
      where: {
        name: "DagangOS supported opportunities",
        id: { not: "default-opportunity-discovery" },
      },
    });
    await transaction.searchCampaign.upsert({
      where: { id: "default-opportunity-discovery" },
      create: {
        id: "default-opportunity-discovery",
        name: "DagangOS supported opportunities",
        enabled: true,
        categories: [],
        keywords: [],
        excludedKeywords: ["unpaid", "volunteer only", "commission only", "adult content"],
        locations: [],
        languages: [],
        sources: [],
        productRoutes: [],
        jobTypes: [],
        minimumMargin: null,
        schedule: "every 4 hours",
      },
      update: {
        categories: [],
        keywords: [],
        locations: [],
        languages: [],
        sources: [],
        productRoutes: [],
        jobTypes: [],
        minimumMargin: null,
      },
    });
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
      const startedAt = Date.now();
      const discoveryRun = await prisma.opportunityDiscoveryRun.create({
        data: { connectorId: connector.id, status: "running" },
      });
      let connectorFetched = 0;
      let connectorAccepted = 0;
      let connectorRejected = 0;
      let connectorCreated = 0;
      let connectorUpdated = 0;
      try {
        if (!connectorTypeIsSupported(connector.connectorType))
          throw new Error(`Enabled connector has no production adapter: ${connector.connectorType}`);
        const opportunities = await fetchConnectorOpportunities(
          connector.connectorType,
          connector.configuration,
        );
        connectorFetched = opportunities.length;
        fetched += opportunities.length;
        for (const opportunity of opportunities) {
          if (!campaignAllows(opportunity, campaigns)) {
            rejected += 1;
            connectorRejected += 1;
            continue;
          }
          connectorAccepted += 1;
          const result = await saveOpportunity(connector.id, opportunity);
          if (result === "created") {
            created += 1;
            connectorCreated += 1;
          } else {
            updated += 1;
            connectorUpdated += 1;
          }
        }
        await prisma.$transaction([
          prisma.sourceConnector.update({
            where: { id: connector.id },
            data: { health: "healthy", lastSuccessAt: new Date(), errorRate: 0 },
          }),
          prisma.opportunityDiscoveryRun.update({
            where: { id: discoveryRun.id },
            data: {
              status: "completed",
              fetched: connectorFetched,
              accepted: connectorAccepted,
              rejected: connectorRejected,
              created: connectorCreated,
              updated: connectorUpdated,
              latencyMs: Date.now() - startedAt,
              completedAt: new Date(),
            },
          }),
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message.slice(0, 1_000) : "Connector failed";
        errors.push({ connector: connector.name, error: message });
        await prisma.$transaction([
          prisma.sourceConnector.update({
            where: { id: connector.id },
            data: { health: "failed", errorRate: 100 },
          }),
          prisma.opportunityDiscoveryRun.update({
            where: { id: discoveryRun.id },
            data: {
              status: "failed",
              fetched: connectorFetched,
              accepted: connectorAccepted,
              rejected: connectorRejected,
              created: connectorCreated,
              updated: connectorUpdated,
              latencyMs: Date.now() - startedAt,
              error: message,
              completedAt: new Date(),
            },
          }),
        ]);
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

export async function reclassifyStoredOpportunities() {
  const leads = await prisma.jobLead.findMany();
  let updated = 0;
  for (const lead of leads) {
    const raw = configurationObject(lead.rawSnapshot);
    const opportunity: CanonicalOpportunity = {
      externalId: lead.externalId || lead.id,
      title: lead.title,
      description: lead.description || "",
      sourceUrl: lead.sourceUrl || "",
      source: lead.source,
      category: typeof raw.category === "string" ? raw.category : lead.subcategory || undefined,
      location: lead.location || undefined,
      language: lead.language || "en",
      engagementModel: lead.engagementModel || undefined,
      budgetType: (lead.budgetType as CanonicalOpportunity["budgetType"]) || "unknown",
      budgetPeriod: (lead.budgetPeriod as CanonicalOpportunity["budgetPeriod"]) || "unknown",
      budgetMin: lead.budgetMin == null ? undefined : Number(lead.budgetMin),
      budgetMax: lead.budgetMax == null ? undefined : Number(lead.budgetMax),
      currency: lead.currency || undefined,
      attribution: typeof raw.attribution === "string" ? raw.attribution : lead.source,
    };
    const scores = scoreOpportunity(opportunity);
    await prisma.jobLead.update({
      where: { id: lead.id },
      data: {
        serviceFamily: scores.serviceFamily,
        category: scores.category,
        requiredSkills: scores.requiredSkills,
        keywords: scores.keywords,
        engagementModel: normalizeJobType(opportunity.engagementModel),
        score: scores.score,
        legitimacyScore: scores.legitimacyScore,
        capabilityScore: scores.capabilityScore,
        profitabilityScore: scores.profitabilityScore,
        riskScore: scores.riskScore,
        productRoute: scores.productRoute,
        routeDecision: scores.routeDecision,
        riskFlags: scores.riskFlags,
        scoreBreakdown: scores.breakdown as Prisma.InputJsonValue,
        pipelineStatus: lead.pipelineStatus === "new_lead" || lead.pipelineStatus === "scored"
          ? scores.score >= 65 ? "scored" : "new_lead"
          : lead.pipelineStatus,
      },
    });
    updated += 1;
  }
  return { updated };
}

export async function generateOpportunityProposal(
  leadId: string,
  adminId: string,
) {
  const lead = await prisma.jobLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Opportunity not found");
  if (!['DIRECT_FULFILMENT', 'CUSTOM_QUOTE'].includes(lead.routeDecision || ""))
    throw new Error("A verified DagangOS product route is required before drafting a proposal");
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
