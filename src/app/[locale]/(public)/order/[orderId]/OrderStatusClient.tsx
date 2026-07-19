"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, Clock, Download, MessageSquare, ThumbsUp } from "lucide-react";
import { cn, etaLabel } from "@/lib/utils";

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
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="glass border border-white/10 rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Order</div>
            <div className="text-2xl font-black">{data.orderNumber}</div>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider",
            data.status === "DELIVERED" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
            data.status === "DRAFT_REVIEW" ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" :
            "bg-white/5 text-muted-foreground border border-white/10"
          )}>
            {data.status.replace(/_/g, " ")}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Package", value: data.package.toUpperCase() },
            { label: "Payment", value: invoice?.status?.replace(/_/g, " ") || "—" },
            { label: "Revisions", value: `${data.revisionCount}/${data.maxRevisions}` },
            { label: "Resolution", value: data.resolution },
          ].map(({ label, value }) => (
            <div key={label} className="glass rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
              <div className="font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {eta && !["DELIVERED", "DRAFT_REVIEW"].includes(data.status) && (
          <div className="mt-4 p-4 glass rounded-xl border border-white/5 flex items-center gap-3">
            <Clock className="w-5 h-5 text-gold-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Estimated draft ready</div>
              <div className="font-semibold">{eta}</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div className="glass border border-white/10 rounded-2xl p-8 mb-8">
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
                {isCurrent && <span className="ml-auto text-xs text-gold-400 font-medium">● Current</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Draft ready — approve or revise */}
      {data.status === "DRAFT_REVIEW" && (
        <div className="glass border border-gold-500/30 rounded-2xl p-8 mb-8 glow-gold">
          <h2 className="font-bold text-xl mb-2 gold-text">Your Draft is Ready</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Review your draft and approve it or request changes. You have {data.maxRevisions - data.revisionCount} revision{data.maxRevisions - data.revisionCount !== 1 ? "s" : ""} remaining.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={approveDraft}
              disabled={submitting}
              className="flex items-center justify-center gap-2 py-4 gold-gradient text-black font-bold rounded-xl"
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
                  className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-sm focus:border-gold-500/50 focus:outline-none resize-none"
                />
                <button
                  onClick={requestRevision}
                  disabled={submitting || !revisionNote.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 glass border border-white/10 rounded-xl text-sm font-semibold disabled:opacity-50"
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
        <div className="glass border border-green-500/30 rounded-2xl p-8 mb-8">
          <h2 className="font-bold text-xl mb-2 text-green-400">Final Video Delivered 🎉</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your video is ready. Download it before the link expires.
            {deliveryLink.expiresAt && ` Link expires ${new Date(deliveryLink.expiresAt).toLocaleDateString()}.`}
          </p>
          <a
            href={`/api/v1/orders/${data.id}/download`}
            className="flex items-center justify-center gap-2 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Final Video
          </a>
        </div>
      )}
    </div>
  );
}
