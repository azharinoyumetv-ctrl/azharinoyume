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
  products: Array<{ key: string; name: string; usdCents: number; credits: number; kind: string }>;
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

  return <div className="max-w-4xl space-y-10">
    <div><h1 className="text-3xl font-black">Settings</h1><p className="text-muted-foreground mt-1">Pricing, customer payment methods, and gated experiments.</p></div>
    {message && <div className="glass border border-white/10 rounded-xl p-4 text-sm">{message}</div>}
    <section>
      <div className="mb-4"><h2 className="text-lg font-bold">Payment gateways</h2><p className="text-sm text-muted-foreground">Enable only the providers customers should see. Secrets stay in the deployment environment.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {gateways.map((gateway) => <div key={gateway.id} className="glass border border-white/10 rounded-xl p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3"><b>{gateway.label}</b><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{gateway.mode}</span></div>
          <p className="text-xs text-muted-foreground mt-2 grow">{gateway.description}</p>
          <p className={`text-sm mt-4 ${gateway.configured ? "text-green-400" : "text-amber-400"}`}>{gateway.detail}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Supports {gateway.supports.map((item) => item.toLowerCase()).join(" and ")}</p>
          {gateway.name === "payoneer" && <div className="mt-4 space-y-2"><label className="block text-xs text-muted-foreground">Hosted payment URL</label><input type="url" value={gateway.checkoutUrl} onChange={(event) => setGateways((current) => current.map((item) => item.id === gateway.id ? { ...item, checkoutUrl: event.target.value } : item))} placeholder="https://..." className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"/><button disabled={busyGateway === gateway.id} onClick={() => saveGatewayConfiguration(gateway)} className="w-full rounded-lg border border-white/10 py-2 text-xs disabled:opacity-40">Save payment URL</button></div>}
          <button disabled={busyGateway === gateway.id || (!gateway.configured && !gateway.enabled)} onClick={() => toggleGateway(gateway)} className={`mt-4 py-2.5 rounded-lg border font-semibold disabled:opacity-40 ${gateway.enabled ? "border-green-500/30 text-green-300" : "border-white/10 text-muted-foreground"}`}>
            {busyGateway === gateway.id ? "Saving..." : gateway.enabled ? "Available at checkout" : "Disabled"}
          </button>
        </div>)}
      </div>
    </section>
    <section><h2 className="text-lg font-bold">USD to IDR rate</h2><p className="text-sm text-muted-foreground mb-4">Updated manually. Checkout warns after 24 hours and pauses after 48 hours.</p><div className="flex gap-3"><input type="number" value={rate} onChange={(event) => setRate(event.target.value)} className="px-4 py-3 glass border border-white/10 rounded-xl"/><button onClick={saveRate} className="px-5 py-3 gold-gradient text-black font-bold rounded-xl">Save rate</button></div>{fx && <p className="text-xs text-muted-foreground mt-2">Version {fx.version} · {new Date(fx.effectiveAt).toLocaleString()}</p>}</section>
    <section><h2 className="text-lg font-bold mb-4">Catalog</h2><div className="grid sm:grid-cols-2 gap-3">{products.map((product) => <div key={product.key} className="glass border border-white/5 rounded-xl p-4"><b>{product.name}</b><div className="text-sm text-muted-foreground">${(product.usdCents / 100).toFixed(2)} · {product.credits.toLocaleString()} credits · {product.kind}</div></div>)}</div></section>
    <section><h2 className="text-lg font-bold mb-4">Experimental features</h2>{flags.map((flag) => <div key={flag.key} className="glass border border-white/10 rounded-xl p-4 flex justify-between"><div><b>{flag.key}</b><p className="text-xs text-muted-foreground">{flag.description}</p></div><button onClick={() => toggleFeature(flag.key, flag.enabled)} className={flag.enabled ? "text-green-400" : "text-muted-foreground"}>{flag.enabled ? "Enabled" : "Disabled"}</button></div>)}</section>
  </div>;
}
