import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import LeadKanbanColumn from "@/components/admin/LeadKanbanColumn";

export default async function AdminLeadsPage() {
  const leads = await prisma.jobLead.findMany({
    orderBy: { createdAt: "desc" },
    include: { proposals: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const PIPELINE = ["new", "scored", "drafting", "ready", "submitted", "won", "lost"] as const;
  type Stage = typeof PIPELINE[number];

  const byStage = PIPELINE.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.pipelineStatus === stage);
    return acc;
  }, {} as Record<Stage, typeof leads>);

  const totalWon = leads.filter((l) => l.pipelineStatus === "won").length;
  const totalSubmitted = leads.filter((l) => ["submitted", "won", "lost"].includes(l.pipelineStatus)).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Job Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalSubmitted} submitted · {totalWon} won
            {totalSubmitted > 0 && ` · ${Math.round((totalWon / totalSubmitted) * 100)}% win rate`}
          </p>
        </div>
        <div className="text-xs text-muted-foreground glass border border-white/5 rounded-xl px-4 py-3 max-w-xs">
          Jobs sourced via public RSS feeds only. Admin manually submits approved proposals — no automated applying.
        </div>
      </div>

      {/* Kanban board — horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE.map((stage) => (
          <LeadKanbanColumn key={stage} stage={stage} leads={JSON.parse(JSON.stringify(byStage[stage]))} />
        ))}
      </div>
    </div>
  );
}
