"use client";

import { useState } from "react";

type Gateway = {
  id: string;
  name: string;
  label: string;
  description: string;
  mode: "auto" | "manual";
  supports: string[];
  enabled: boolean;
  configured: boolean;
  detail: string;
  checkoutUrl: string;
};

type Props = {
  fx: { rate: number; version: number; effectiveAt: string } | null;
  products: Array<{ key: string; name: string; usdCents: number; credits: number; kind: string; active: boolean }>;
  flags: Array<{ key: string; enabled: boolean; description: string | null }>;
  gateways: Gateway[];
};

export default function SettingsClient({ fx, products, flags, gateways: initialGateways }: Props) {
  const [rate, setRate] = useState(String(fx?.rate || ""));
  const [message, setMessage] = useState("");
  const [gateways, setGateways] = useState(initialGateways);
  const [busyGateway, setBusyGateway] = useState<string | null>(null);

  async function saveRate() {
    const response = await fetch("/api/admin/settings/fx-rate", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rate: Number(rate) }) });
    setMessage(response.ok ? "Rate updated and checkout quotes now use the new version." : "Could not update rate.");
  }

  async function toggleFeature(key: string, enabled: boolean) {
    await fetch(`/api/admin/settings/feature-flags/${key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
    window.location.reload();
  }

  async function toggleGateway(gateway: Gateway) {
    setBusyGateway(gateway.id);
    setMessage("");
    const response = await fetch(`/api/admin/settings/payment-providers/${gateway.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !gateway.enabled }),
    });
    const result = await response.json();
    if (response.ok) {
      setGateways((current) => current.map((item) => item.id === gateway.id ? { ...item, enabled: result.enabled, configured: result.configured, detail: result.detail } : item));
      setMessage(`${gateway.label} is now ${result.enabled ? "available" : "hidden"} at checkout.`);
    } else {
      setMessage(result.error || `Could not update ${gateway.label}.`);
    }
    setBusyGateway(null);
  }

  async function saveGatewayConfiguration(gateway: Gateway) {
    setBusyGateway(gateway.id);
    setMessage("");
    const response = await fetch(`/api/admin/settings/payment-providers/${gateway.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutUrl: gateway.checkoutUrl }),
    });
    const result = await response.json();
    if (response.ok) {
      setGateways((current) => current.map((item) => item.id === gateway.id ? { ...item, checkoutUrl: result.checkoutUrl, configured: result.configured, detail: result.detail } : item));
      setMessage(`${gateway.label} configuration saved.`);
    } else {
      setMessage(result.error || `Could not configure ${gateway.label}.`);
    }
    setBusyGateway(null);
  }

  return <div className="max-w-4xl space-y-8 sm:space-y-10">
    <div><h1 className="text-3xl font-black sm:text-4xl">Settings</h1><p className="mt-1 text-muted-foreground">Pricing, customer payment methods, and gated experiments.</p></div>
    {message && <div className="glass border border-white/10 rounded-xl p-4 text-sm">{message}</div>}
    <section>
      <div className="mb-4"><h2 className="text-lg font-bold">Payment gateways</h2><p className="text-sm text-muted-foreground">Enable only the providers customers should see. Secrets stay in the deployment environment.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {gateways.map((gateway) => <div key={gateway.id} className="glass flex flex-col rounded-xl border border-white/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><b>{gateway.label}</b><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{gateway.mode}</span></div>
          <p className="text-xs text-muted-foreground mt-2 grow">{gateway.description}</p>
          <p className={`text-sm mt-4 ${gateway.configured ? "text-green-400" : "text-amber-400"}`}>{gateway.detail}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Supports {gateway.supports.map((item) => item.toLowerCase()).join(" and ")}</p>
          {gateway.name === "payoneer" && <div className="mt-4 space-y-2"><label className="block text-xs text-muted-foreground">Hosted payment URL</label><input type="url" inputMode="url" value={gateway.checkoutUrl} onChange={(event) => setGateways((current) => current.map((item) => item.id === gateway.id ? { ...item, checkoutUrl: event.target.value } : item))} placeholder="https://..." className="min-h-12 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-base sm:text-sm"/><button disabled={busyGateway === gateway.id} onClick={() => saveGatewayConfiguration(gateway)} className="min-h-12 w-full rounded-lg border border-white/10 px-3 text-sm disabled:opacity-40">Save payment URL</button></div>}
          <button disabled={busyGateway === gateway.id || (!gateway.configured && !gateway.enabled)} onClick={() => toggleGateway(gateway)} className={`mt-4 py-2.5 rounded-lg border font-semibold disabled:opacity-40 ${gateway.enabled ? "border-green-500/30 text-green-300" : "border-white/10 text-muted-foreground"}`}>
            {busyGateway === gateway.id ? "Saving..." : gateway.enabled ? "Available at checkout" : "Disabled"}
          </button>
        </div>)}
      </div>
    </section>
    <section><h2 className="text-lg font-bold">USD to IDR rate</h2><p className="mb-4 text-sm text-muted-foreground">Updated manually. Checkout warns after 24 hours and pauses after 48 hours.</p><div className="flex flex-col gap-3 min-[480px]:flex-row"><input type="number" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} className="glass min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 px-4 py-3"/><button onClick={saveRate} className="gold-gradient min-h-12 rounded-xl px-5 font-bold text-black">Save rate</button></div>{fx && <p className="mt-2 text-xs text-muted-foreground">Version {fx.version} · {new Date(fx.effectiveAt).toLocaleString()}</p>}</section>
    <section><h2 className="text-lg font-bold mb-4">Catalog</h2><div className="grid sm:grid-cols-2 gap-3">{products.map((product) => <div key={product.key} className={`glass rounded-xl border p-4 ${product.active ? "border-green-500/20" : "border-white/5 opacity-60"}`}><div className="flex items-start justify-between gap-3"><b>{product.name}</b><span className={`text-[10px] uppercase tracking-widest ${product.active ? "text-green-400" : "text-muted-foreground"}`}>{product.active ? "Active" : "Archived"}</span></div><div className="text-sm text-muted-foreground">${(product.usdCents / 100).toFixed(2)} · {product.kind}{product.kind === "PROJECT" ? " · one-time project" : ` · ${product.credits.toLocaleString()} legacy credits`}</div></div>)}</div></section>
    <section><h2 className="mb-4 text-lg font-bold">Experimental features</h2><div className="space-y-3">{flags.map((flag) => <div key={flag.key} className="glass flex flex-col justify-between gap-3 rounded-xl border border-white/10 p-4 min-[480px]:flex-row min-[480px]:items-center"><div className="min-w-0"><b className="break-words">{flag.key}</b><p className="text-xs text-muted-foreground">{flag.description}</p></div><button onClick={() => toggleFeature(flag.key, flag.enabled)} className={`min-h-12 rounded-lg px-4 text-left min-[480px]:text-center ${flag.enabled ? "text-green-400" : "text-muted-foreground"}`}>{flag.enabled ? "Enabled" : "Disabled"}</button></div>)}</div></section>
  </div>;
}
