import { prisma } from "@/lib/prisma";
import LeadKanbanColumn from "@/components/admin/LeadKanbanColumn";
import LeadIntakeForm from "@/components/admin/LeadIntakeForm";
import { DashboardHeader, SectionHeader, StatusPill } from "@/components/dashboard/DashboardPrimitives";

export default async function AdminLeadsPage() {
  const leads = await prisma.jobLead.findMany({ orderBy: { createdAt: "desc" }, include: { proposals: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const PIPELINE = ["new_lead", "scored", "drafting", "ready", "submitted", "won", "lost"] as const;
  type Stage = typeof PIPELINE[number];
  const byStage = PIPELINE.reduce((accumulator, stage) => { accumulator[stage] = leads.filter((lead) => lead.pipelineStatus === stage || (stage === "new_lead" && lead.pipelineStatus === "new")); return accumulator; }, {} as Record<Stage, typeof leads>);
  const totalWon = leads.filter((lead) => lead.pipelineStatus === "won").length;
  const totalSubmitted = leads.filter((lead) => ["submitted", "won", "lost"].includes(lead.pipelineStatus)).length;
  const winRate = totalSubmitted > 0 ? Math.round((totalWon / totalSubmitted) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 sm:space-y-8">
      <DashboardHeader eyebrow="Lead intelligence" title="Opportunity pipeline" description="Inbound requests and approved sources flow into one review board. Score, draft, and track outcomes without automatic applications." badge={<StatusPill tone="violet">{leads.length} leads</StatusPill>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <LeadIntakeForm />
        <div className="dashboard-panel grid grid-cols-3 gap-2 p-3 text-center"><div className="rounded-xl bg-white/[.02] p-3"><div className="text-xl font-black">{totalSubmitted}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-white/30">Submitted</div></div><div className="rounded-xl bg-white/[.02] p-3"><div className="text-xl font-black text-emerald-300">{totalWon}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-white/30">Won</div></div><div className="rounded-xl bg-white/[.02] p-3"><div className="text-xl font-black text-gold-400">{winRate}%</div><div className="mt-1 text-[9px] uppercase tracking-wider text-white/30">Win rate</div></div></div>
      </div>
      <section>
        <SectionHeader title="Pipeline board" description="Swipe horizontally on phone and tablet" />
        <div className="scrollbar-thin overscroll-x -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-4 sm:mx-0 sm:gap-4 sm:px-0">
          {PIPELINE.map((stage) => <LeadKanbanColumn key={stage} stage={stage} leads={JSON.parse(JSON.stringify(byStage[stage]))} />)}
        </div>
      </section>
    </div>
  );
}
