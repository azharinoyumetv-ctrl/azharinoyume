"use client";

import { useState } from "react";
import { Play, Pause, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react";

interface Order { id: string; status: string; manualReviewRequired: boolean; adminApproved: boolean; }

export default function AdminOrderActions({ order }: { order: Order }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");
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

      {order.manualReviewRequired && !order.adminApproved && (
        <div className="space-y-2">
          <div className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Wise payment awaiting approval
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add approval note (optional)"
            rows={2}
            className="w-full px-3 py-2 glass border border-white/10 rounded-lg text-xs focus:outline-none resize-none"
          />
          <button
            onClick={() => action("/api/admin/wise-approve", { orderId: order.id, notes: note }, "wise")}
            disabled={loading === "wise"}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading === "wise" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve Wise Payment
          </button>
        </div>
      )}

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
