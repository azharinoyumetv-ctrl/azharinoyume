"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";

type Product = { key: string; kind: string; name: string; usdCents: number; credits: number };
type Gateway = { name: "doku" | "xendit" | "midtrans" | "payoneer"; label: string; supports: string[]; mode: "auto" | "manual" };
type Action = { type: "REDIRECT"; url: string } | { type: "QR"; qrString: string } | { type: "NONE" };

export default function BillingClient({ initialWallet, products, gateways, subscriptions, payments }: { initialWallet: number; products: Product[]; gateways: Gateway[]; subscriptions: Array<{ id: string; productKey: string; status: string; nextBillingAt: string | null; cancelAtPeriodEnd: boolean }>; payments: Array<{ id: string; provider: string; status: string; usdCents: number; idrAmount: number; currency: string; createdAt: string }> }) {
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState(""); const [qrImage, setQrImage] = useState<string | null>(null);
  async function buy(product: Product, gateway: Gateway["name"]) {
    setBusy(`${product.key}:${gateway}`); setError(""); setQrImage(null);
    try {
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
  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:space-y-10 sm:py-12">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black sm:text-4xl">Wallet & billing</h1><p className="mt-1 text-muted-foreground">Permanent and plan credits in one balance.</p></div><div className="text-left sm:text-right"><div className="text-sm text-muted-foreground">Available</div><div className={`text-2xl font-black sm:text-3xl ${initialWallet < 0 ? "text-red-400" : "gold-text"}`}>{initialWallet.toLocaleString()} credits</div></div></div>
    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}
    {qrImage && <div className="rounded-xl border border-gold-500/30 bg-white p-4 text-center text-black sm:p-6"><h2 className="font-bold">Scan with QRIS</h2><Image unoptimized src={qrImage} alt="Xendit QRIS payment code" width={320} height={320} className="mx-auto my-4 h-auto w-full max-w-80" /><p className="text-sm">Open your banking or wallet app and choose QRIS. The wallet balance updates after the signed webhook is processed.</p></div>}
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">{products.map((product) => <div key={product.key} className="glass rounded-2xl border border-white/10 p-5 sm:p-6"><div className="text-xs uppercase tracking-widest text-muted-foreground">One-time pack</div><h2 className="mt-2 text-xl font-bold">{product.name}</h2><div className="mt-3 text-3xl font-black">${(product.usdCents / 100).toFixed(2)}</div><p className="mt-1 text-sm text-muted-foreground">{product.credits.toLocaleString()} credits</p><div className="mt-6 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">{gateways.filter((gateway) => gateway.supports.includes(product.kind)).map((gateway) => <button key={gateway.name} disabled={!!busy} onClick={() => buy(product, gateway.name)} className={`min-h-12 rounded-lg border border-white/10 px-3 font-semibold disabled:opacity-40 ${gateway.name === "xendit" ? "gold-gradient text-black" : ""}`}>{gateway.label}</button>)}</div>{gateways.filter((gateway) => gateway.supports.includes("PACK")).length === 0 && <p className="mt-5 text-xs text-amber-300">Checkout is temporarily unavailable.</p>}{gateways.some((gateway) => gateway.name === "payoneer" && gateway.supports.includes(product.kind)) && <p className="mt-3 text-[11px] text-muted-foreground">Payoneer payments are credited after administrator reconciliation.</p>}</div>)}</div>
    {subscriptions.length > 0 && <section><h2 className="mb-4 text-2xl font-bold">Subscriptions</h2><div className="space-y-2">{subscriptions.map((item) => <div key={item.id} className="glass flex flex-col gap-3 rounded-xl border border-white/10 p-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between"><div className="min-w-0"><div className="break-words font-semibold">{item.productKey}</div><div className="text-sm text-muted-foreground">{item.status}{item.cancelAtPeriodEnd ? " · cancels at period end" : ""}</div></div>{!item.cancelAtPeriodEnd && <button onClick={() => cancel(item.id)} className="min-h-12 rounded-lg px-3 text-left text-sm text-red-300 min-[480px]:text-center">Cancel renewal</button>}</div>)}</div></section>}
    <section><h2 className="mb-4 text-2xl font-bold">Recent payments</h2><div className="space-y-2">{payments.map((item) => <div key={item.id} className="glass flex flex-col gap-1 rounded-xl border border-white/5 p-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between"><span className="break-words">{item.provider.toUpperCase()} · {item.currency === "USD" ? `$${(item.usdCents / 100).toFixed(2)}` : `Rp ${item.idrAmount.toLocaleString("id-ID")}`}</span><span className="text-sm capitalize text-muted-foreground">{item.status}</span></div>)}</div></section>
    <Link href="/portal" className="inline-flex min-h-12 items-center rounded-lg pr-4 text-gold-400">← Back to projects</Link>
  </div>;
}
