"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Circle, Clock, Download, MessageSquare, ThumbsUp } from "lucide-react";
import { cn, etaLabel } from "@/lib/utils";
import { DashboardHeader, StatusPill } from "@/components/dashboard/DashboardPrimitives";

const STATUS_STEPS = [
  { key: "DRAFT_UPLOAD", label: "Project Created" },
  { key: "QUEUED", label: "Credits Reserved" },
  { key: "RENDERING", label: "Rendering" },
  { key: "DRAFT_REVIEW", label: "Draft Ready" },
  { key: "REVISION_REQUESTED", label: "Revision" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  package: string;
  purpose: string | null;
  visualStyle: string | null;
  resolution: string;
  aspectRatio: string | null;
  queuePosition: number | null;
  revisionCount: number;
  maxRevisions: number;
  invoices: { status: string; paidAmount: number | null; currency: string }[];
  deliveryLinks: { r2Key: string | null; expiresAt: string | null }[];
  renders: { status: string }[];
  revisions: { revisionNumber: number; status: string }[];
}

export default function OrderStatusClient({ order }: { order: OrderData }) {
  const [data, setData] = useState(order);
  const [revisionNote, setRevisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${data.id}`);
        if (res.ok) setData(await res.json());
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [data.id]);

  const currentStepIdx = STATUS_ORDER.indexOf(data.status);
  const invoice = data.invoices[0];
  const deliveryLink = data.deliveryLinks[0];
  const eta = data.queuePosition != null ? etaLabel(data.queuePosition, data.package) : null;
  const statusTone = data.status === "DELIVERED" ? "green" : data.status === "DRAFT_REVIEW" ? "violet" : data.status === "RENDERING" ? "blue" : data.status === "RENDER_FAILED" ? "red" : data.status === "QUEUED" ? "gold" : "neutral";

  async function approveDraft() {
    setSubmitting(true);
    await fetch(`/api/orders/${data.id}/approve`, { method: "POST" });
    setSubmitting(false);
  }

  async function requestRevision() {
    if (!revisionNote.trim()) return;
    setSubmitting(true);
    await fetch(`/api/orders/${data.id}/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: revisionNote }),
    });
    setRevisionNote("");
    setSubmitting(false);
  }

  return (
    <div className="dashboard-backdrop min-h-[calc(100svh-4rem-env(safe-area-inset-top))]">
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
      {/* Header */}
      <DashboardHeader eyebrow="Video project" title={data.orderNumber} description={`${data.purpose || "AI video edit"} · ${data.visualStyle || "Custom style"}`} badge={<StatusPill tone={statusTone} pulse={data.status === "RENDERING"}>{data.status.replace(/_/g, " ")}</StatusPill>} actions={<Link href="/portal" className="dashboard-action"><ArrowLeft className="h-4 w-4" /> Back to studio</Link>} />

      <div className="dashboard-panel p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:gap-4">
          {[
            { label: "Package", value: data.package.toUpperCase() },
            { label: "Payment", value: invoice?.status?.replace(/_/g, " ") || "—" },
            { label: "Revisions", value: `${data.revisionCount}/${data.maxRevisions}` },
            { label: "Resolution", value: data.resolution },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/7 bg-white/[.025] p-3 sm:p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</div>
              <div className="font-semibold text-white/85">{value}</div>
            </div>
          ))}
        </div>

        {eta && !["DELIVERED", "DRAFT_REVIEW"].includes(data.status) && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold-500/15 bg-gold-500/5 p-4">
            <Clock className="w-5 h-5 text-gold-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-white/35">Estimated draft ready</div>
              <div className="font-semibold">{eta}</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div className="dashboard-panel p-5 sm:p-8">
        <h2 className="font-bold mb-6 text-sm uppercase tracking-widest text-muted-foreground">Progress</h2>
        <div className="space-y-4">
          {STATUS_STEPS.map((s, i) => {
            const isDone = i < currentStepIdx;
            const isCurrent = s.key === data.status;
            return (
              <div key={s.key} className="flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                  isDone ? "bg-green-500 text-white" :
                  isCurrent ? "bg-gold-500 text-black animate-pulse" :
                  "bg-white/5 text-muted-foreground"
                )}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </div>
                <span className={cn("text-sm", isCurrent ? "text-white font-semibold" : isDone ? "text-muted-foreground" : "text-muted-foreground/50")}>
                  {s.label}
                </span>
                {isCurrent && <StatusPill tone="gold" pulse>Current</StatusPill>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Draft ready — approve or revise */}
      {data.status === "DRAFT_REVIEW" && (
        <div className="dashboard-panel glow-gold border-gold-500/30 p-5 sm:p-8">
          <h2 className="font-bold text-xl mb-2 gold-text">Your Draft is Ready</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Review your draft and approve it or request changes. You have {data.maxRevisions - data.revisionCount} revision{data.maxRevisions - data.revisionCount !== 1 ? "s" : ""} remaining.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={approveDraft}
              disabled={submitting}
              className="gold-gradient flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 font-bold text-black"
            >
              <ThumbsUp className="w-4 h-4" />
              Approve — Render Final Video
            </button>

            {data.revisionCount < data.maxRevisions && (
              <div className="space-y-3">
                <textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Describe what you'd like changed..."
                  rows={3}
                  className="glass w-full resize-none rounded-xl border border-white/10 px-4 py-3 text-base focus:border-gold-500/50 focus:outline-none"
                />
                <button
                  onClick={requestRevision}
                  disabled={submitting || !revisionNote.trim()}
                  className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Request Revision
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final delivery */}
      {["DELIVERED", "DRAFT_REVIEW"].includes(data.status) && deliveryLink?.r2Key && (
        <div className="dashboard-panel border-green-500/30 p-5 sm:p-8">
          <h2 className="font-bold text-xl mb-2 text-green-400">Final Video Delivered 🎉</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your video is ready. Download it before the link expires.
            {deliveryLink.expiresAt && ` Link expires ${new Date(deliveryLink.expiresAt).toLocaleDateString()}.`}
          </p>
          <a
            href={`/api/v1/orders/${data.id}/download`}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-green-500 px-4 font-bold text-white transition-colors hover:bg-green-600"
          >
            <Download className="w-5 h-5" />
            Download Final Video
          </a>
        </div>
      )}
    </div>
    </div>
  );
}
