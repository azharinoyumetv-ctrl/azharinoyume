"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";

type Product = { key: string; kind: string; name: string; usdCents: number; credits: number };
type Gateway = { name: "doku" | "xendit" | "payoneer"; label: string; supports: string[]; mode: "auto" | "manual" };
type Action = { type: "REDIRECT"; url: string } | { type: "QR"; qrString: string } | { type: "NONE" };

export default function BillingClient({ initialWallet, products, gateways, subscriptions, payments }: { initialWallet: number; products: Product[]; gateways: Gateway[]; subscriptions: Array<{ id: string; productKey: string; status: string; nextBillingAt: string | null; cancelAtPeriodEnd: boolean }>; payments: Array<{ id: string; provider: string; status: string; usdCents: number; idrAmount: number; currency: string; createdAt: string }> }) {
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState(""); const [qrImage, setQrImage] = useState<string | null>(null);
  async function buy(product: Product, gateway: Gateway["name"]) {
    setBusy(`${product.key}:${gateway}`); setError(""); setQrImage(null);
    try {
      if (product.kind === "SUBSCRIPTION") throw new Error("Recurring card checkout will become available after Xendit enables tokenized recurring cards for the merchant account.");
      const quoteKey = crypto.randomUUID();
      const quoteResponse = await fetch("/api/v1/quotes", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `quote-${quoteKey}` }, body: JSON.stringify({ kind: "CREDITS", productKey: product.key }) });
      const quote = await quoteResponse.json(); if (!quoteResponse.ok) throw new Error(quote.error || "Could not create quote");
      const paymentResponse = await fetch("/api/v1/payments", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `payment-${crypto.randomUUID()}` }, body: JSON.stringify({ quoteId: quote.id, gateway, channel: gateway === "xendit" ? "QRIS" : undefined }) });
      const payment = await paymentResponse.json(); if (!paymentResponse.ok) throw new Error(payment.error || "Could not start payment");
      const action = payment.action as Action;
      if (action.type === "REDIRECT") window.location.assign(action.url);
      else if (action.type === "QR") setQrImage(await QRCode.toDataURL(action.qrString, { width: 320, margin: 2, errorCorrectionLevel: "M" }));
      else window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout failed"); } finally { setBusy(null); }
  }
  async function cancel(id: string) { await fetch(`/api/v1/subscriptions/${id}/cancel`, { method: "POST" }); window.location.reload(); }
  return <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
    <div className="flex justify-between items-end"><div><h1 className="text-4xl font-black">Wallet & billing</h1><p className="text-muted-foreground mt-1">Permanent and plan credits in one balance.</p></div><div className="text-right"><div className="text-sm text-muted-foreground">Available</div><div className={`text-3xl font-black ${initialWallet < 0 ? "text-red-400" : "gold-text"}`}>{initialWallet.toLocaleString()} credits</div></div></div>
    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}
    {qrImage && <div className="rounded-xl border border-gold-500/30 bg-white p-6 text-black text-center"><h2 className="font-bold">Scan with QRIS</h2><Image unoptimized src={qrImage} alt="Xendit QRIS payment code" width={320} height={320} className="mx-auto my-4" /><p className="text-sm">Open your banking or wallet app and choose QRIS. The wallet balance updates after the signed webhook is processed.</p></div>}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{products.map((product) => <div key={product.key} className="glass rounded-2xl border border-white/10 p-6"><div className="text-xs uppercase tracking-widest text-muted-foreground">{product.kind === "PACK" ? "One-time pack" : "30-day plan"}</div><h2 className="text-xl font-bold mt-2">{product.name}</h2><div className="text-3xl font-black mt-3">${(product.usdCents / 100).toFixed(2)}</div><p className="text-sm text-muted-foreground mt-1">{product.credits.toLocaleString()} credits</p><div className="grid grid-cols-2 gap-2 mt-6">{gateways.filter((gateway) => gateway.supports.includes(product.kind)).map((gateway) => <button key={gateway.name} disabled={!!busy || product.kind !== "PACK"} onClick={() => buy(product, gateway.name)} className={`py-2.5 rounded-lg border border-white/10 font-semibold disabled:opacity-40 ${gateway.name === "xendit" ? "gold-gradient text-black" : ""}`}>{gateway.label}</button>)}</div>{product.kind === "PACK" && gateways.filter((gateway) => gateway.supports.includes("PACK")).length === 0 && <p className="text-xs text-amber-300 mt-5">Checkout is temporarily unavailable.</p>}{gateways.some((gateway) => gateway.name === "payoneer" && gateway.supports.includes(product.kind)) && <p className="text-[11px] text-muted-foreground mt-3">Payoneer payments are credited after administrator reconciliation.</p>}</div>)}</div>
    {subscriptions.length > 0 && <section><h2 className="text-2xl font-bold mb-4">Subscriptions</h2>{subscriptions.map((item) => <div key={item.id} className="glass border border-white/10 rounded-xl p-4 flex justify-between"><div><div className="font-semibold">{item.productKey}</div><div className="text-sm text-muted-foreground">{item.status}{item.cancelAtPeriodEnd ? " · cancels at period end" : ""}</div></div>{!item.cancelAtPeriodEnd && <button onClick={() => cancel(item.id)} className="text-sm text-red-300">Cancel renewal</button>}</div>)}</section>}
    <section><h2 className="text-2xl font-bold mb-4">Recent payments</h2><div className="space-y-2">{payments.map((item) => <div key={item.id} className="glass border border-white/5 rounded-xl p-4 flex justify-between"><span>{item.provider.toUpperCase()} · {item.currency === "USD" ? `$${(item.usdCents / 100).toFixed(2)}` : `Rp ${item.idrAmount.toLocaleString("id-ID")}`}</span><span className="text-sm">{item.status}</span></div>)}</div></section>
    <Link href="/portal" className="inline-block text-gold-400">← Back to projects</Link>
  </div>;
}
