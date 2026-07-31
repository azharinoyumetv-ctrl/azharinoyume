"use client";

import { FilePlus2, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunOpportunityScanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/opportunities/scan", {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: string;
        fetched?: number;
        created?: number;
        updated?: number;
      };
      if (!response.ok) throw new Error(result.error || "Discovery failed");
      setMessage(
        `Reviewed ${result.fetched || 0}; added ${result.created || 0}; updated ${result.updated || 0}.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {message && <span className="text-[11px] text-white/40">{message}</span>}
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="dashboard-action"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Scan approved sources
      </button>
    </div>
  );
}

export function GenerateProposalButton({
  leadId,
  hasProposal,
}: {
  leadId: string;
  hasProposal: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/opportunities/${encodeURIComponent(leadId)}/proposal`,
        { method: "POST" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Proposal generation failed");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proposal generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (hasProposal) {
    return <span className="text-[11px] font-semibold text-emerald-300">Draft ready</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-300/15 bg-violet-300/5 px-3 text-[11px] font-bold text-violet-200 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FilePlus2 className="h-3.5 w-3.5" />
        )}
        Draft proposal
      </button>
      {error && <div className="mt-1 max-w-36 text-[10px] text-rose-300">{error}</div>}
    </div>
  );
}
