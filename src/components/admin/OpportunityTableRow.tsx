"use client";

import { ArrowUpRight } from "lucide-react";
import { KeyboardEvent, MouseEvent } from "react";
import { GenerateProposalButton } from "@/components/admin/OpportunityActions";
import { StatusPill } from "@/components/dashboard/DashboardPrimitives";

export type OpportunityRowData = {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  sourceName: string;
  category: string | null;
  productRoute: string | null;
  routeDecision: string | null;
  engagementModel: string | null;
  keywords: string[];
  budgetMin: string | null;
  budgetMax: string | null;
  budgetType: string | null;
  budgetPeriod: string | null;
  currency: string | null;
  capabilityScore: number | null;
  commercialScore: number | null;
  riskScore: number | null;
  pipelineStatus: string;
  hasProposal: boolean;
};

function riskTone(score: number | null) {
  if (score == null) return "neutral" as const;
  if (score >= 70) return "red" as const;
  if (score >= 40) return "gold" as const;
  return "green" as const;
}

function Score({ value }: { value: number | null }) {
  return (
    <span className={value == null ? "text-white/25" : value >= 70 ? "font-black text-emerald-300" : value >= 40 ? "font-black text-amber-300" : "font-black text-rose-300"}>
      {value?.toFixed(0) || "—"}
    </span>
  );
}

function isInteractive(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a,button,input,select,textarea,label"));
}

export function OpportunityTableRow({ lead }: { lead: OpportunityRowData }) {
  function openSource() {
    if (lead.sourceUrl) window.open(lead.sourceUrl, "_blank", "noopener,noreferrer");
  }

  function onClick(event: MouseEvent<HTMLTableRowElement>) {
    if (!isInteractive(event.target)) openSource();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if ((event.key === "Enter" || event.key === " ") && !isInteractive(event.target)) {
      event.preventDefault();
      openSource();
    }
  }

  const compensation = lead.budgetMin || lead.budgetMax
    ? `${lead.currency || "USD"} ${lead.budgetMin || "?"}–${lead.budgetMax || "?"}${lead.budgetPeriod && lead.budgetPeriod !== "unknown" ? ` / ${lead.budgetPeriod}` : ""}`
    : "Not stated";

  return (
    <tr
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={lead.sourceUrl ? 0 : -1}
      role={lead.sourceUrl ? "link" : undefined}
      aria-label={lead.sourceUrl ? `Open ${lead.title} at source` : undefined}
      className={lead.sourceUrl ? "cursor-pointer hover:bg-white/[.035] focus:bg-white/[.04] focus:outline-none" : "hover:bg-white/[.02]"}
    >
      <td className="max-w-md px-5 py-4">
        {lead.sourceUrl ? (
          <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-white/85 hover:text-cyan-200">
            {lead.title}
          </a>
        ) : (
          <div className="font-semibold text-white/80">{lead.title}</div>
        )}
        <div className="mt-1 line-clamp-1 text-xs text-white/30">{lead.description || "No source description retained"}</div>
      </td>
      <td className="px-3 py-4 text-white/65">{lead.category || "Other"}</td>
      <td className="px-3 py-4 text-white/55">{lead.engagementModel || "Not specified"}</td>
      <td className="max-w-56 px-3 py-4">
        <div className="flex flex-wrap gap-1">
          {lead.keywords.slice(0, 4).map((keyword) => (
            <span key={keyword} className="rounded-md bg-white/[.045] px-1.5 py-1 text-[9px] text-white/45">{keyword}</span>
          ))}
          {!lead.keywords.length && <span className="text-xs text-white/25">No extracted keywords</span>}
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="text-cyan-200/65">{lead.productRoute || "Routing required"}</div>
        <div className="mt-1 text-[9px] uppercase tracking-wide text-white/25">{(lead.routeDecision || "review_required").replaceAll("_", " ")}</div>
      </td>
      <td className="px-3 py-4 text-white/60">
        <div>{compensation}</div>
        <div className="mt-1 text-[9px] uppercase tracking-wide text-white/25">{lead.budgetType || "unknown"}</div>
      </td>
      <td className="px-3 py-4"><Score value={lead.capabilityScore} /></td>
      <td className="px-3 py-4"><Score value={lead.commercialScore} /></td>
      <td className="px-3 py-4"><StatusPill tone={riskTone(lead.riskScore)}>{lead.riskScore?.toFixed(0) || "—"}</StatusPill></td>
      <td className="px-3 py-4"><StatusPill tone={lead.pipelineStatus === "won" ? "green" : "neutral"}>{lead.pipelineStatus.replaceAll("_", " ")}</StatusPill></td>
      <td className="px-3 py-4">
        <GenerateProposalButton
          leadId={lead.id}
          hasProposal={lead.hasProposal}
          canDraft={["DIRECT_FULFILMENT", "CUSTOM_QUOTE"].includes(lead.routeDecision || "") && (lead.capabilityScore || 0) >= 60}
        />
      </td>
      <td className="px-5 py-4">
        {lead.sourceUrl ? (
          <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200">
            {lead.sourceName}<ArrowUpRight className="h-3 w-3" />
          </a>
        ) : <span className="text-white/40">{lead.sourceName}</span>}
      </td>
    </tr>
  );
}
