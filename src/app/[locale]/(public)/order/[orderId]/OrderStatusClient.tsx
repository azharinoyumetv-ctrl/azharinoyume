"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  CreditCard,
  Download,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { cn, etaLabel } from "@/lib/utils";
import {
  DashboardHeader,
  StatusPill,
} from "@/components/dashboard/DashboardPrimitives";

const STATUS_STEPS = [
  { key: "AWAITING_PAYMENT", label: "Brief confirmed" },
  { key: "ANALYSIS_QUEUED", label: "Footage analysis" },
  { key: "EDIT_PLANNING", label: "Edit planning" },
  { key: "DRAFT_RENDERING", label: "Draft render" },
  { key: "QUALITY_CHECK", label: "Quality check" },
  { key: "DRAFT_REVIEW", label: "Your review" },
  { key: "FINAL_RENDERING", label: "Final render" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATUS_ORDER = STATUS_STEPS.map((step) => step.key);

type Gateway = {
  name: "doku" | "xendit" | "midtrans" | "payoneer";
  label: string;
  mode: "auto" | "manual";
};

type PaymentAction =
  | { type: "REDIRECT"; url: string }
  | { type: "QR"; qrString: string }
  | { type: "NONE" };

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  package: string;
  purpose: string | null;
  visualStyle: string | null;
  mood: string | null;
  resolution: string;
  aspectRatio: string | null;
  queuePosition: number | null;
  revisionCount: number;
  maxRevisions: number;
  totalPrice: number;
  currency: string;
  quoteId: string | null;
  briefAmbiguityScore: number;
  invoices: {
    id: string;
    status: string;
    paidAmount: number | null;
    currency: string;
  }[];
  deliveryLinks: { r2Key: string | null; expiresAt: string | null }[];
  renders: {
    id: string;
    status: string;
    renderType: string;
    variantKey: string;
    aspectRatio: string | null;
    resolution: string | null;
  }[];
  revisions: { revisionNumber: number; status: string }[];
}

export default function OrderStatusClient({
  order,
  gateways,
}: {
  order: OrderData;
  gateways: Gateway[];
}) {
  const [data, setData] = useState(order);
  const [revisionNote, setRevisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${data.id}`);
        if (response.ok) setData(await response.json());
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [data.id]);

  const invoice = data.invoices[0];
  const availableRenders = data.renders.filter((render) =>
    data.status === "DELIVERED" ? render.renderType === "final" : render.renderType === "draft",
  );
  const statusForProgress =
    {
      QUEUED: "DRAFT_RENDERING",
      RENDERING: "DRAFT_RENDERING",
      ANALYZING: "ANALYSIS_QUEUED",
      PLANNING: "EDIT_PLANNING",
      DRAFT_READY_TO_RENDER: "DRAFT_RENDERING",
      REVISION_REQUESTED: "DRAFT_REVIEW",
      PRODUCTION_REVIEW_REQUIRED: "QUALITY_CHECK",
      QA_FAILED: "QUALITY_CHECK",
    }[data.status] || data.status;
  const currentStepIdx = STATUS_ORDER.indexOf(statusForProgress);
  const eta =
    data.queuePosition != null
      ? etaLabel(data.queuePosition, data.package)
      : null;
  const statusTone =
    data.status === "DELIVERED"
      ? "green"
      : data.status === "DRAFT_REVIEW"
        ? "violet"
        : ["DRAFT_RENDERING", "FINAL_RENDERING", "RENDERING"].includes(
              data.status,
            )
          ? "blue"
          : data.status.includes("FAILED") || data.status === "PAYMENT_DISPUTED"
            ? "red"
            : ["ANALYSIS_QUEUED", "EDIT_PLANNING", "QUALITY_CHECK"].includes(
                  data.status,
                )
              ? "gold"
              : "neutral";

  async function startPayment(gateway: Gateway["name"]) {
    setPaymentBusy(gateway);
    setPaymentError("");
    setQrImage(null);
    try {
      const quoteResponse = await fetch(`/api/v1/orders/${data.id}/quote`, {
        method: "POST",
        headers: {
          "Idempotency-Key": `project-quote-${crypto.randomUUID()}`,
        },
      });
      const quote = await quoteResponse.json();
      if (!quoteResponse.ok)
        throw new Error(quote.error || "Could not refresh checkout quote");
      const response = await fetch("/api/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `project-payment-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          quoteId: quote.id,
          gateway,
          channel: gateway === "xendit" ? "QRIS" : undefined,
        }),
      });
      const payment = await response.json();
      if (!response.ok)
        throw new Error(payment.error || "Could not start payment");
      const action = payment.action as PaymentAction;
      if (action.type === "REDIRECT") window.location.assign(action.url);
      else if (action.type === "QR")
        setQrImage(
          await QRCode.toDataURL(action.qrString, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
        );
      else window.location.reload();
    } catch (cause) {
      setPaymentError(
        cause instanceof Error ? cause.message : "Checkout failed",
      );
    } finally {
      setPaymentBusy(null);
    }
  }

  async function approveDraft() {
    setSubmitting(true);
    setPaymentError("");
    try {
      const response = await fetch(`/api/orders/${data.id}/approve`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Draft approval could not be completed");
      window.location.reload();
    } catch (cause) {
      setPaymentError(cause instanceof Error ? cause.message : "Draft approval failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestRevision() {
    if (!revisionNote.trim()) return;
    setSubmitting(true);
    setPaymentError("");
    try {
      const response = await fetch(`/api/orders/${data.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: revisionNote }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Revision request could not be submitted");
      setRevisionNote("");
      window.location.reload();
    } catch (cause) {
      setPaymentError(cause instanceof Error ? cause.message : "Revision request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-backdrop min-h-[calc(100svh-4rem-env(safe-area-inset-top))]">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
        <DashboardHeader
          eyebrow="Automated production"
          title={data.orderNumber}
          description={`${data.purpose || "Video production"} · ${data.visualStyle || "Custom style"} · ${data.mood || "Custom mood"}`}
          badge={
            <StatusPill
              tone={statusTone}
              pulse={["ANALYSIS_QUEUED", "DRAFT_RENDERING", "RENDERING"].includes(
                data.status,
              )}
            >
              {data.status.replace(/_/g, " ")}
            </StatusPill>
          }
          actions={
            <Link href="/portal" className="dashboard-action">
              <ArrowLeft className="h-4 w-4" /> Back to studio
            </Link>
          }
        />

        <div className="dashboard-panel p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5 sm:gap-4">
            {[
              { label: "Package", value: data.package.toUpperCase() },
              {
                label: "Price",
                value: `$${Number(data.totalPrice).toFixed(2)}`,
              },
              {
                label: "Payment",
                value: invoice?.status?.replace(/_/g, " ") || "—",
              },
              {
                label: "Revisions",
                value: `${data.revisionCount}/${data.maxRevisions}`,
              },
              { label: "Resolution", value: data.resolution },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/7 bg-white/[.025] p-3 sm:p-4"
              >
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                  {label}
                </div>
                <div className="font-semibold capitalize text-white/85">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {eta &&
            !["DELIVERED", "DRAFT_REVIEW", "AWAITING_PAYMENT"].includes(
              data.status,
            ) && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold-500/15 bg-gold-500/5 p-4">
                <Clock className="h-5 w-5 flex-shrink-0 text-gold-400" />
                <div>
                  <div className="text-xs text-white/35">
                    Estimated draft ready
                  </div>
                  <div className="font-semibold">{eta}</div>
                </div>
              </div>
            )}
        </div>

        {data.status === "AWAITING_PAYMENT" && invoice && (
          <section className="dashboard-panel border-gold-400/20 p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2 text-gold-300">
                  <CreditCard className="h-5 w-5" />
                  <h2 className="text-xl font-black">Confirm payment</h2>
                </div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                  The brief and footage are verified. Analysis, planning, and
                  rendering remain locked until the signed gateway confirmation
                  marks this invoice paid.
                </p>
              </div>
              <a
                href={`/api/invoice/${invoice.id}/pdf`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold"
              >
                Download invoice
              </a>
            </div>

            {paymentError && (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.07] p-3 text-sm text-rose-200">
                {paymentError}
              </div>
            )}

            {qrImage && (
              <div className="mt-5 rounded-2xl bg-white p-4 text-center text-black">
                <h3 className="font-bold">Scan with QRIS</h3>
                <Image
                  unoptimized
                  src={qrImage}
                  alt="Xendit QRIS payment code"
                  width={320}
                  height={320}
                  className="mx-auto my-3 h-auto w-full max-w-80"
                />
                <p className="text-sm">
                  The order starts automatically after the signed payment
                  webhook is reconciled.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {gateways.map((gateway) => (
                <button
                  key={gateway.name}
                  type="button"
                  disabled={Boolean(paymentBusy)}
                  onClick={() => startPayment(gateway.name)}
                  className={cn(
                    "min-h-12 rounded-xl border border-white/10 px-4 text-sm font-bold disabled:opacity-40",
                    gateway.name === "xendit" &&
                      "gold-gradient border-0 text-black",
                  )}
                >
                  {paymentBusy === gateway.name
                    ? "Starting…"
                    : `Pay with ${gateway.label}`}
                </button>
              ))}
            </div>
            {gateways.length === 0 && (
              <p className="mt-5 text-sm text-amber-200">
                Checkout is temporarily unavailable. The invoice remains
                pending and production has not started.
              </p>
            )}
          </section>
        )}

        <div className="dashboard-panel p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Production path
            </h2>
            <span className="text-xs text-white/30">
              Brief ambiguity: {data.briefAmbiguityScore}/100
            </span>
          </div>
          <div className="space-y-4">
            {STATUS_STEPS.map((statusStep, index) => {
              const isDone = currentStepIdx >= 0 && index < currentStepIdx;
              const isCurrent = statusStep.key === statusForProgress;
              return (
                <div key={statusStep.key} className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all",
                      isDone
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "animate-pulse bg-gold-500 text-black"
                          : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      isCurrent
                        ? "font-semibold text-white"
                        : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {statusStep.label}
                  </span>
                  {isCurrent && (
                    <StatusPill tone="gold" pulse>
                      Current
                    </StatusPill>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {data.status === "DRAFT_REVIEW" && (
          <div className="dashboard-panel glow-gold border-gold-500/30 p-5 sm:p-8">
            <h2 className="gold-text mb-2 text-xl font-bold">
              Your draft is ready
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Approve the brief-compliant draft or submit one consolidated,
              in-scope revision. You have{" "}
              {data.maxRevisions - data.revisionCount} remaining.
            </p>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {availableRenders.map((render) => (
                  <a key={render.id} href={`/api/v1/orders/${data.id}/download?renderId=${encodeURIComponent(render.id)}`} className="glass flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold">
                    <Download className="h-4 w-4" /> Review {render.variantKey.replace(/-/g, " ")} · {render.aspectRatio}
                  </a>
                ))}
              </div>
              <button
                onClick={approveDraft}
                disabled={submitting}
                className="gold-gradient flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 font-bold text-black"
              >
                <ThumbsUp className="h-4 w-4" />
                Approve and render final
              </button>
              {data.revisionCount < data.maxRevisions && (
                <div className="space-y-3">
                  <textarea
                    value={revisionNote}
                    onChange={(event) => setRevisionNote(event.target.value)}
                    placeholder="Use timestamps and describe one consolidated in-scope correction request…"
                    rows={4}
                    className="glass w-full resize-y rounded-xl border border-white/10 px-4 py-3 text-base focus:border-gold-500/50 focus:outline-none"
                  />
                  <button
                    onClick={requestRevision}
                    disabled={submitting || !revisionNote.trim()}
                    className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Submit revision round
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {data.status === "DELIVERED" && availableRenders.length > 0 && (
          <div className="dashboard-panel border-green-500/30 p-5 sm:p-8">
            <h2 className="mb-2 text-xl font-bold text-green-400">
              Final video delivered
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Download every verified deliverable before its secure retention window expires.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {availableRenders.map((render) => (
                <a key={render.id} href={`/api/v1/orders/${data.id}/download?renderId=${encodeURIComponent(render.id)}`} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-green-500 px-4 text-sm font-bold text-white transition-colors hover:bg-green-600">
                  <Download className="h-5 w-5" />
                  {render.variantKey.replace(/-/g, " ")} · {render.aspectRatio} · {render.resolution}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
