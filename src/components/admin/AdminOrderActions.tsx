"use client";

import { useState } from "react";
import { Play, Pause, RefreshCw, Check, Loader2 } from "lucide-react";

interface Order { id: string; status: string; manualReviewRequired: boolean; adminApproved: boolean; }

export default function AdminOrderActions({ order }: { order: Order }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function action(endpoint: string, body: object = {}, key: string) {
    setLoading(key);
    setMessage("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(null);
    setMessage(res.ok ? "Done." : data.error || "Failed");
  }

  return (
    <div className="glass border border-white/5 rounded-2xl p-6 space-y-3">
      <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Admin Actions</h2>

      {order.manualReviewRequired && !order.adminApproved && <div className="text-xs text-amber-400 rounded-lg bg-amber-500/10 px-3 py-2">This order needs a human review before delivery.</div>}

      <button
        onClick={() => action(`/api/admin/orders/${order.id}/approve`, {}, "approve")}
        disabled={loading === "approve"}
        className="w-full flex items-center justify-center gap-2 py-2.5 glass border border-white/10 rounded-lg text-sm hover:border-white/20 transition-all disabled:opacity-50"
      >
        {loading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-green-400" />}
        Approve Order
      </button>

      <button
        onClick={() => action(`/api/admin/orders/${order.id}/retry`, {}, "retry")}
        disabled={loading === "retry"}
        className="w-full flex items-center justify-center gap-2 py-2.5 glass border border-white/10 rounded-lg text-sm hover:border-white/20 transition-all disabled:opacity-50"
      >
        {loading === "retry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-blue-400" />}
        Retry Processing
      </button>

      <button
        onClick={() => action(`/api/admin/orders/${order.id}/mark-delivered`, {}, "deliver")}
        disabled={loading === "deliver"}
        className="w-full flex items-center justify-center gap-2 py-2.5 glass border border-white/10 rounded-lg text-sm hover:border-white/20 transition-all disabled:opacity-50"
      >
        {loading === "deliver" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-gold-400" />}
        Mark Delivered
      </button>

      <button
        onClick={() => action(`/api/admin/orders/${order.id}/pause`, {}, "pause")}
        disabled={loading === "pause"}
        className="w-full flex items-center justify-center gap-2 py-2.5 glass border border-red-500/20 text-red-400 rounded-lg text-sm hover:border-red-500/40 transition-all disabled:opacity-50"
      >
        {loading === "pause" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
        Pause Order
      </button>

      {message && <div className="text-xs text-center text-muted-foreground pt-1">{message}</div>}
    </div>
  );
}
