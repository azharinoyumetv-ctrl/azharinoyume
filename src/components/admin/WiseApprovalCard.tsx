"use client";

import { useState } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface OrderData {
  id: string;
  orderNumber: string;
  customerEmail: string;
  totalPrice: number;
  currency: string;
  invoices: { invoiceNumber: string; paymentReference: string | null; total: number }[];
}

export default function WiseApprovalCard({ order }: { order: OrderData }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const invoice = order.invoices[0];

  async function approve() {
    setLoading(true);
    await fetch("/api/admin/wise-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, notes: note }),
    });
    setDone(true);
    setLoading(false);
  }

  if (done) return (
    <div className="p-4 glass border border-green-500/20 rounded-2xl text-sm text-green-400">
      ✓ Wise payment approved for {order.orderNumber}. Processing started.
    </div>
  );

  return (
    <div className="glass border border-amber-500/20 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <Link href={`/admin/orders/${order.id}`} className="font-bold hover:text-gold-400 transition-colors">
              {order.orderNumber}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
          {invoice && (
            <div className="text-sm mt-2">
              <span className="text-muted-foreground">Invoice: </span>{invoice.invoiceNumber}
              {invoice.paymentReference && (
                <span className="ml-2 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">ref: {invoice.paymentReference}</span>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-black">{formatCurrency(Number(order.totalPrice), order.currency)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Wise bank transfer</div>
        </div>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Approval note (optional — e.g. 'verified in Wise dashboard')"
          className="w-full px-3 py-2 glass border border-white/10 rounded-lg text-sm focus:outline-none focus:border-amber-500/40"
        />
        <div className="flex gap-3">
          <button
            onClick={approve}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve & Start Processing
          </button>
        </div>
      </div>
    </div>
  );
}
