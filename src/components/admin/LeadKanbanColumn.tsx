"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  new_lead: "New",
  scored: "Scored",
  drafting: "Drafting",
  ready: "Ready",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new: "border-white/10",
  new_lead: "border-white/10",
  scored: "border-blue-500/20",
  drafting: "border-amber-500/20",
  ready: "border-purple-500/20",
  submitted: "border-cyan-500/20",
  won: "border-green-500/30",
  lost: "border-red-500/20",
};

interface Lead {
  id: string;
  title: string;
  source: string;
  sourceUrl: string | null;
  score: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string | null;
  createdAt: string;
  proposals: { draftText: string; status: string }[];
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return <span className={`text-xs font-bold ${color}`}>{score}</span>;
}

function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const [moving, setMoving] = useState(false);
  const router = useRouter();

  async function move(stage: string) {
    setMoving(true);
    await fetch(`/api/admin/leads/${lead.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    setMoving(false);
    router.refresh();
  }

  const proposal = lead.proposals[0];

  return (
    <div className="space-y-3 rounded-xl border border-white/7 bg-black/20 p-3.5 transition-colors hover:border-white/15">
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-white/85">{lead.title}</div>
        <ScoreBadge score={lead.score} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{lead.source}</span>
        {lead.budgetMin && (
          <span>
            {lead.currency} {lead.budgetMin}–{lead.budgetMax}
          </span>
        )}
      </div>

      {lead.sourceUrl && (
        <a
          href={lead.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1 rounded-lg text-xs text-blue-400 transition-colors hover:text-blue-300"
        >
          View listing <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {proposal && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex min-h-10 items-center gap-1 rounded-lg text-xs text-muted-foreground transition-colors hover:text-white"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide" : "View"} proposal draft
          </button>
          {expanded && (
            <div className="scrollbar-thin mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-white/[.025] p-3 text-xs leading-relaxed text-white/50">
              {proposal.draftText}
            </div>
          )}
        </div>
      )}

      {/* Stage move buttons */}
      <div className="flex gap-1.5 pt-1 flex-wrap">
        {["won", "lost"].map((s) => (
          <button
            key={s}
            onClick={() => move(s)}
            disabled={moving}
            className={`min-h-10 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              s === "won"
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {moving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : s === "won" ? "Mark Won" : "Mark Lost"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeadKanbanColumn({ stage, leads }: { stage: string; leads: Lead[] }) {
  return (
    <div className={`dashboard-panel w-[min(84vw,20rem)] flex-shrink-0 snap-start p-3.5 sm:w-72 sm:p-4 ${STAGE_COLORS[stage] || "border-white/10"}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-sm">{STAGE_LABELS[stage] || stage}</span>
        <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground">{leads.length}</span>
      </div>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Empty</div>}
      </div>
    </div>
  );
}
