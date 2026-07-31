import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Cable,
  FileCheck2,
  MessageSquareText,
  Radar,
  Search,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  DashboardHeader,
  MetricCard,
  SectionHeader,
  StatusPill,
} from "@/components/dashboard/DashboardPrimitives";
import { formatCurrency } from "@/lib/utils";

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

function toneForRisk(score: number | null) {
  if (score == null) return "neutral" as const;
  if (score >= 70) return "red" as const;
  if (score >= 40) return "gold" as const;
  return "green" as const;
}

export default async function OpportunityWorkspace({
  view,
}: {
  view: OpportunityView;
}) {
  const [
    leads,
    campaigns,
    connectors,
    proposals,
    contracts,
    interviews,
  ] = await Promise.all([
    prisma.jobLead.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        proposals: { orderBy: { createdAt: "desc" }, take: 1 },
        connector: true,
      },
    }),
    prisma.searchCampaign.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.sourceConnector.findMany({ orderBy: { name: "asc" } }),
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
  ]);

  const qualified = leads.filter(
    (lead) => numberValue(lead.score) != null && Number(lead.score) >= 70,
  ).length;
  const submitted = leads.filter((lead) =>
    ["submitted", "won", "lost"].includes(lead.pipelineStatus),
  ).length;
  const won = leads.filter((lead) => lead.pipelineStatus === "won").length;
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
          value={leads.length}
          icon={Radar}
          tone="blue"
          detail="No synthetic fallback records"
        />
        <MetricCard
          label="Qualified"
          value={qualified}
          icon={Search}
          tone="violet"
          detail="Score 70 or higher"
        />
        <MetricCard
          label="Applications"
          value={submitted}
          icon={FileCheck2}
          tone="gold"
          detail={`${won} won`}
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
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-white/7 text-[9px] font-black uppercase tracking-[.14em] text-white/25">
                <tr>
                  <th className="px-5 py-3">Opportunity</th>
                  <th className="px-3 py-3">Category / route</th>
                  <th className="px-3 py-3">Budget</th>
                  <th className="px-3 py-3">Capability</th>
                  <th className="px-3 py-3">Profit</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">Pipeline</th>
                  <th className="px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[.02]">
                    <td className="max-w-md px-5 py-4">
                      <div className="font-semibold text-white/80">{lead.title}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-white/30">
                        {lead.description || "No source description retained"}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-white/65">{lead.category || "Unclassified"}</div>
                      <div className="mt-1 text-xs text-cyan-200/55">
                        {lead.productRoute || "Routing required"}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-white/60">
                      {lead.budgetMin || lead.budgetMax
                        ? `${lead.currency || "USD"} ${lead.budgetMin || "?"}–${lead.budgetMax || "?"}`
                        : "Not stated"}
                    </td>
                    <ScoreCell value={numberValue(lead.capabilityScore) ?? numberValue(lead.score)} />
                    <ScoreCell value={numberValue(lead.profitabilityScore)} />
                    <td className="px-3 py-4">
                      <StatusPill tone={toneForRisk(numberValue(lead.riskScore))}>
                        {numberValue(lead.riskScore)?.toFixed(0) || "—"}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-4">
                      <StatusPill tone={lead.pipelineStatus === "won" ? "green" : "neutral"}>
                        {lead.pipelineStatus.replaceAll("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      {lead.sourceUrl ? (
                        <a
                          href={lead.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-300"
                        >
                          {lead.connector?.name || lead.source}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-white/40">
                          {lead.connector?.name || lead.source}
                        </span>
                      )}
                    </td>
                  </tr>
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
                Minimum budget: {campaign.minimumBudget ? `$${campaign.minimumBudget}` : "not set"} ·
                Minimum margin: {campaign.minimumMargin ? `${campaign.minimumMargin}%` : "not set"}
              </p>
            </article>
          ))}
        </RecordGrid>
      )}

      {view === "connectors" && (
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
              </dl>
            </article>
          ))}
        </RecordGrid>
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

function ScoreCell({ value }: { value: number | null }) {
  return (
    <td className="px-3 py-4">
      <span className={value == null ? "text-white/25" : value >= 70 ? "font-black text-emerald-300" : value >= 40 ? "font-black text-amber-300" : "font-black text-rose-300"}>
        {value?.toFixed(0) || "—"}
      </span>
    </td>
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
