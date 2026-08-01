"use client";

import { Loader2, Power, PowerOff, TestTube2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Feedback = { tone: "error" | "success"; text: string } | null;

export function ConnectorControls({
  connectorId,
  enabled,
}: {
  connectorId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"test" | "toggle" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function testConnection() {
    setBusy("test");
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/admin/connectors/${encodeURIComponent(connectorId)}/test`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        fetched?: number;
        latencyMs?: number;
      };
      if (!response.ok) throw new Error(result.error || "Connection test failed");
      setFeedback({
        tone: "success",
        text: `${result.fetched ?? 0} jobs received in ${result.latencyMs ?? 0} ms`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function toggle() {
    setBusy("toggle");
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/admin/connectors/${encodeURIComponent(connectorId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !enabled }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Connector update failed");
      setFeedback({
        tone: "success",
        text: enabled ? "Collection disabled" : "Connection verified and collection enabled",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Connector update failed",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={testConnection}
          disabled={busy !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40"
        >
          {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
          Test source
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs font-bold text-white/70 disabled:opacity-40"
        >
          {busy === "toggle" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : enabled ? (
            <PowerOff className="h-4 w-4" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {feedback && (
        <p className={`text-[11px] ${feedback.tone === "success" ? "text-emerald-300" : "text-rose-300"}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}

export function CampaignControl({
  campaignId,
  enabled,
}: {
  campaignId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/campaigns/${encodeURIComponent(campaignId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Campaign update failed");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Campaign update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs font-bold text-white/70 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        {enabled ? "Pause campaign" : "Enable campaign"}
      </button>
      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}
