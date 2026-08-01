import Link from "next/link";
import {
  BriefcaseBusiness,
  Cable,
  FileCheck2,
  MessageSquareText,
  Radar,
  Search,
} from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DashboardHeader,
  MetricCard,
  SectionHeader,
  StatusPill,
} from "@/components/dashboard/DashboardPrimitives";
import { formatCurrency } from "@/lib/utils";
import { RunOpportunityScanButton } from "@/components/admin/OpportunityActions";
import {
  CampaignControl,
  ConnectorControls,
} from "@/components/admin/OpportunityControls";
import {
  bootstrapOpportunityEngine,
  SUPPORTED_CONNECTOR_TYPES,
} from "@/lib/opportunities/engine";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunities/classification";
import { OpportunityTableRow } from "@/components/admin/OpportunityTableRow";
import { RssConnectorForm } from "@/components/admin/RssConnectorForm";

export type OpportunityView =
  | "opportunities"
  | "campaigns"
  | "connectors"
  | "proposals"
  | "applications"
  | "contracts"
  | "interviews";

const TABS: Array<{
  key: OpportunityView;
  label: string;
  href: string;
}> = [
  { key: "opportunities", label: "All opportunities", href: "/admin/opportunities" },
  { key: "campaigns", label: "Campaigns", href: "/admin/campaigns" },
  { key: "connectors", label: "Sources", href: "/admin/connectors" },
  { key: "proposals", label: "Proposals", href: "/admin/proposals" },
  { key: "applications", label: "Applications", href: "/admin/applications" },
  { key: "contracts", label: "Contracts", href: "/admin/contracts" },
  { key: "interviews", label: "Interviews", href: "/admin/interviews" },
];

function numberValue(value: unknown) {
  return value == null ? null : Number(value);
}

export type OpportunityFilters = {
  q?: string;
  category?: string;
  jobType?: string;
  source?: string;
  route?: string;
};

export default async function OpportunityWorkspace({
  view,
  filters = {},
}: {
  view: OpportunityView;
  filters?: OpportunityFilters;
}) {
  await bootstrapOpportunityEngine();
  const conditions: Prisma.JobLeadWhereInput[] = [];
  if (filters.q?.trim()) {
    conditions.push({
      OR: [
        { title: { contains: filters.q.trim(), mode: "insensitive" } },
        { description: { contains: filters.q.trim(), mode: "insensitive" } },
      ],
    });
  }
  if (filters.category) conditions.push({ category: filters.category });
  if (filters.jobType) conditions.push({ engagementModel: filters.jobType });
  if (filters.source) conditions.push({ source: filters.source });
  if (filters.route) conditions.push({ productRoute: filters.route });
  const leadWhere: Prisma.JobLeadWhereInput = conditions.length ? { AND: conditions } : {};
  const [
    leads,
    campaigns,
    connectors,
    proposals,
    contracts,
    interviews,
    totalDiscovered,
    totalQualified,
    totalSubmitted,
    totalWon,
    filteredTotal,
    sourceOptions,
    jobTypeOptions,
    routeOptions,
  ] = await Promise.all([
    prisma.jobLead.findMany({
      where: leadWhere,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        proposals: { orderBy: { createdAt: "desc" }, take: 1 },
        connector: true,
      },
    }),
    prisma.searchCampaign.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.sourceConnector.findMany({
      where: { connectorType: { in: [...SUPPORTED_CONNECTOR_TYPES] } },
      orderBy: { name: "asc" },
    }),
    prisma.proposalDraft.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { jobLead: true },
    }),
    prisma.opportunityContract.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { interview: true, jobLead: true, specifications: true },
    }),
    prisma.customerInterview.findMany({
      orderBy: [{ ambiguityScore: "desc" }, { updatedAt: "desc" }],
      take: 100,
      include: { contract: true, specifications: true },
    }),
    prisma.jobLead.count(),
    prisma.jobLead.count({
      where: {
        score: { gte: 70 },
        routeDecision: { in: ["DIRECT_FULFILMENT", "CUSTOM_QUOTE"] },
      },
    }),
    prisma.jobLead.count({ where: { pipelineStatus: { in: ["submitted", "won", "lost"] } } }),
    prisma.jobLead.count({ where: { pipelineStatus: "won" } }),
    prisma.jobLead.count({ where: leadWhere }),
    prisma.jobLead.findMany({ distinct: ["source"], select: { source: true }, orderBy: { source: "asc" } }),
    prisma.jobLead.findMany({ distinct: ["engagementModel"], select: { engagementModel: true }, orderBy: { engagementModel: "asc" } }),
    prisma.jobLead.findMany({ distinct: ["productRoute"], select: { productRoute: true }, orderBy: { productRoute: "asc" } }),
  ]);

  const interviewsBlocked = interviews.filter(
    (interview) =>
      interview.status !== "completed" || interview.ambiguityScore > 20,
  ).length;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 sm:space-y-8">
      <DashboardHeader
        eyebrow="DagangOS opportunity intelligence"
        title={TABS.find((tab) => tab.key === view)?.label || "Opportunity engine"}
        description="Discover across approved sources, normalize every category, route to real product capabilities, protect margin, and keep every external action under operator approval."
        badge={<StatusPill tone="green">Human approval enforced</StatusPill>}
      />

      {view === "opportunities" && <RunOpportunityScanButton />}

      <nav className="scrollbar-thin -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`min-h-11 shrink-0 rounded-xl border px-4 py-3 text-xs font-bold ${
              tab.key === view
                ? "border-gold-400/25 bg-gold-400/10 text-gold-300"
                : "border-white/8 bg-white/[.02] text-white/40"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Discovered"
          value={totalDiscovered}
          icon={Radar}
          tone="blue"
          detail="No synthetic fallback records"
        />
        <MetricCard
          label="Qualified"
          value={totalQualified}
          icon={Search}
          tone="violet"
          detail="Score 70 or higher"
        />
        <MetricCard
          label="Applications"
          value={totalSubmitted}
          icon={FileCheck2}
          tone="gold"
          detail={`${totalWon} won`}
        />
        <MetricCard
          label="Intake blockers"
          value={interviewsBlocked}
          icon={MessageSquareText}
          tone={interviewsBlocked ? "rose" : "green"}
          detail="Production remains gated"
        />
      </section>

      {view === "opportunities" && (
        <section className="dashboard-panel overflow-hidden">
          <div className="border-b border-white/8 p-4 sm:p-5">
            <SectionHeader
              title="Canonical opportunity feed"
              description="One list across categories and sources; scores stay separate so a profitable lead cannot hide a policy or legitimacy problem."
              action={
                <Link href="/admin/leads" className="text-xs font-bold text-gold-300">
                  Open pipeline board →
                </Link>
              }
            />
            <form action="/admin/opportunities" method="get" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
              <input name="q" defaultValue={filters.q} placeholder="Keyword or job title" className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/40" />
              <select name="category" defaultValue={filters.category || ""} className="min-h-11 rounded-xl border border-white/10 bg-[#111214] px-3 text-sm text-white/70 outline-none focus:border-cyan-300/40">
                <option value="">All categories</option>
                {OPPORTUNITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select name="jobType" defaultValue={filters.jobType || ""} className="min-h-11 rounded-xl border border-white/10 bg-[#111214] px-3 text-sm text-white/70 outline-none focus:border-cyan-300/40">
                <option value="">All job types</option>
                {jobTypeOptions.flatMap((item) => item.engagementModel ? [<option key={item.engagementModel} value={item.engagementModel}>{item.engagementModel}</option>] : [])}
              </select>
              <select name="source" defaultValue={filters.source || ""} className="min-h-11 rounded-xl border border-white/10 bg-[#111214] px-3 text-sm text-white/70 outline-none focus:border-cyan-300/40">
                <option value="">All sources</option>
                {sourceOptions.map((item) => <option key={item.source} value={item.source}>{item.source}</option>)}
              </select>
              <select name="route" defaultValue={filters.route || ""} className="min-h-11 rounded-xl border border-white/10 bg-[#111214] px-3 text-sm text-white/70 outline-none focus:border-cyan-300/40">
                <option value="">All product routes</option>
                {routeOptions.flatMap((item) => item.productRoute ? [<option key={item.productRoute} value={item.productRoute}>{item.productRoute}</option>] : [])}
              </select>
              <div className="flex gap-2">
                <button className="min-h-11 flex-1 rounded-xl bg-cyan-300/10 px-4 text-xs font-black text-cyan-100">Filter</button>
                <Link href="/admin/opportunities" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-3 text-xs text-white/45">Clear</Link>
              </div>
            </form>
            <p className="mt-3 text-[11px] text-white/30">Showing {leads.length} of {filteredTotal} matching opportunities. Click a title, source, or any non-control area in a row to open the original listing.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] text-left text-sm">
              <thead className="border-b border-white/7 text-[9px] font-black uppercase tracking-[.14em] text-white/25">
                <tr>
                  <th className="px-5 py-3">Opportunity</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Job type</th>
                  <th className="px-3 py-3">Keywords</th>
                  <th className="px-3 py-3">Product route</th>
                  <th className="px-3 py-3">Compensation</th>
                  <th className="px-3 py-3">Capability</th>
                  <th className="px-3 py-3">Commercial</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">Pipeline</th>
                  <th className="px-3 py-3">Proposal</th>
                  <th className="px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <OpportunityTableRow key={lead.id} lead={{
                    id: lead.id,
                    title: lead.title,
                    description: lead.description,
                    sourceUrl: lead.sourceUrl,
                    sourceName: lead.connector?.name || lead.source,
                    category: lead.category,
                    productRoute: lead.productRoute,
                    routeDecision: lead.routeDecision,
                    engagementModel: lead.engagementModel,
                    keywords: Array.isArray(lead.keywords) ? lead.keywords.map(String) : [],
                    budgetMin: lead.budgetMin?.toString() || null,
                    budgetMax: lead.budgetMax?.toString() || null,
                    budgetType: lead.budgetType,
                    budgetPeriod: lead.budgetPeriod,
                    currency: lead.currency,
                    capabilityScore: numberValue(lead.capabilityScore),
                    commercialScore: numberValue(lead.profitabilityScore),
                    riskScore: numberValue(lead.riskScore),
                    pipelineStatus: lead.pipelineStatus,
                    hasProposal: lead.proposals.length > 0,
                  }} />
                ))}
              </tbody>
            </table>
          </div>
          {!leads.length && <EmptyState text="No opportunities have been collected from an approved source." />}
        </section>
      )}

      {view === "campaigns" && (
        <RecordGrid
          title="Search campaigns"
          description="Saved discovery policies replace the old single keyword and location setting."
          empty="No campaigns are configured. Create one only after its sources and product routes are approved."
        >
          {campaigns.map((campaign) => (
            <article key={campaign.id} className="dashboard-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{campaign.name}</h3>
                  <p className="mt-1 text-xs text-white/35">{campaign.schedule || "Manual run"}</p>
                </div>
                <StatusPill tone={campaign.enabled ? "green" : "neutral"}>
                  {campaign.enabled ? "Enabled" : "Disabled"}
                </StatusPill>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">
                Minimum budget: {campaign.minimumBudget ? `$${campaign.minimumBudget}` : "not set"}. Profitability is calculated only after delivery cost and fees are known.
              </p>
              <CampaignControl campaignId={campaign.id} enabled={campaign.enabled} />
            </article>
          ))}
        </RecordGrid>
      )}

      {view === "connectors" && (
        <>
        <RssConnectorForm />
        <RecordGrid
          title="Sources and connectors"
          description="Every source declares its permission method, allowed actions, health, authentication, retention, and kill switch."
          empty="No source connector is enabled. The engine will not invent fallback jobs."
        >
          {connectors.map((connector) => (
            <article key={connector.id} className="dashboard-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                    <Cable className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold">{connector.name}</h3>
                    <p className="mt-1 text-xs text-white/35">{connector.collectionMethod}</p>
                  </div>
                </div>
                <StatusPill tone={connector.health === "healthy" ? "green" : "neutral"}>
                  {connector.health}
                </StatusPill>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Detail label="Permission" value={connector.permissionMethod} />
                <Detail label="Policy" value={connector.policyStatus} />
                <Detail label="Authentication" value={connector.authStatus} />
                <Detail label="Retention" value={connector.retentionDays ? `${connector.retentionDays} days` : "Not set"} />
                <Detail label="Collection" value={connector.enabled ? "Enabled" : "Disabled"} />
                <Detail label="Last success" value={connector.lastSuccessAt ? connector.lastSuccessAt.toLocaleString() : "Not tested"} />
              </dl>
              <ConnectorControls connectorId={connector.id} enabled={connector.enabled} />
            </article>
          ))}
        </RecordGrid>
        </>
      )}

      {view === "proposals" && (
        <RecordGrid
          title="Grounded proposals"
          description="Claims must be supported by a registered product capability, available operator, and portfolio evidence."
          empty="No proposal drafts are waiting."
        >
          {proposals.map((proposal) => (
            <article key={proposal.id} className="dashboard-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{proposal.jobLead.title}</h3>
                  <p className="mt-1 text-xs text-white/35">{proposal.jobLead.source}</p>
                </div>
                <StatusPill tone={proposal.status === "submitted" ? "green" : "gold"}>
                  {proposal.status}
                </StatusPill>
              </div>
              <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-white/45">
                {proposal.adminEditedText || proposal.draftText || "Draft text has not been generated."}
              </p>
            </article>
          ))}
        </RecordGrid>
      )}

      {view === "applications" && (
        <RecordGrid
          title="Application lifecycle"
          description="External submission is evidence-backed and operator-approved. Automatic discovery never implies automatic application."
          empty="No applications have been submitted."
        >
          {leads
            .filter((lead) => ["submitted", "won", "lost"].includes(lead.pipelineStatus))
            .map((lead) => (
              <article key={lead.id} className="dashboard-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{lead.title}</h3>
                    <p className="mt-1 text-xs text-white/35">{lead.source}</p>
                  </div>
                  <StatusPill tone={lead.pipelineStatus === "won" ? "green" : lead.pipelineStatus === "lost" ? "red" : "blue"}>
                    {lead.pipelineStatus}
                  </StatusPill>
                </div>
                <p className="mt-4 text-xs leading-5 text-white/40">
                  Product route: {lead.productRoute || "unresolved"} · Policy: {lead.policyStatus}
                </p>
              </article>
            ))}
        </RecordGrid>
      )}

      {view === "contracts" && (
        <RecordGrid
          title="Won work and commercial control"
          description="A won opportunity becomes a contract and interview—not a production project."
          empty="No won opportunities have been converted into contracts."
        >
          {contracts.map((contract) => (
            <article key={contract.id} className="dashboard-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{contract.title}</h3>
                  <p className="mt-1 text-xs text-white/35">{contract.clientCompany || contract.clientName || "Client details required"}</p>
                </div>
                <StatusPill tone={contract.status === "ready_for_production" ? "green" : "gold"}>
                  {contract.status.replaceAll("_", " ")}
                </StatusPill>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Detail label="Revenue" value={contract.agreedRevenue ? formatCurrency(Number(contract.agreedRevenue), contract.currency) : "Not confirmed"} />
                <Detail label="Margin" value={contract.expectedMargin ? `${contract.expectedMargin}%` : "Revalidation required"} />
                <Detail label="Interview" value={contract.interview?.status || "Missing"} />
                <Detail label="Specifications" value={String(contract.specifications.length)} />
              </dl>
            </article>
          ))}
        </RecordGrid>
      )}

      {view === "interviews" && (
        <RecordGrid
          title="Customer interviews and ambiguity control"
          description="Production creation remains disabled until critical answers, assets, conflicts, margin, and customer approval are resolved."
          empty="No customer interview is waiting."
        >
          {interviews.map((interview) => (
            <article key={interview.id} className="dashboard-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{interview.contract.title}</h3>
                  <p className="mt-1 text-xs text-white/35">{interview.contract.clientName || "Client identity required"}</p>
                </div>
                <StatusPill tone={interview.status === "completed" && interview.ambiguityScore <= 20 ? "green" : "red"}>
                  {interview.ambiguityScore} ambiguity
                </StatusPill>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${interview.completionPercent}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/30">
                <span>{interview.completionPercent}% complete</span>
                <span>{interview.specifications.length} specifications</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">
                Status: {interview.status.replaceAll("_", " ")}. Scope-change risk: {Number(interview.scopeChangeRisk).toFixed(0)}%.
              </p>
            </article>
          ))}
        </RecordGrid>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[.018] p-3">
      <dt className="text-[9px] font-black uppercase tracking-wider text-white/25">{label}</dt>
      <dd className="mt-1 capitalize text-white/60">{value}</dd>
    </div>
  );
}

function RecordGrid({
  title,
  description,
  empty,
  children,
}: {
  title: string;
  description: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const populated = items.some(Boolean);
  return (
    <section>
      <SectionHeader title={title} description={description} />
      {populated ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{children}</div>
      ) : (
        <EmptyState text={empty} />
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="dashboard-panel flex min-h-40 items-center justify-center p-6 text-center">
      <div>
        <BriefcaseBusiness className="mx-auto h-6 w-6 text-white/20" />
        <p className="mt-3 max-w-xl text-sm text-white/35">{text}</p>
      </div>
    </div>
  );
}
