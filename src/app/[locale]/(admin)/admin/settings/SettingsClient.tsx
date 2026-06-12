"use client";

import { useState } from "react";
import { Loader2, Save, Info } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  mode: string;
  regions: string[];
}

interface Prices {
  basic: number;
  plus: number;
  premium: number;
  enterprise: number;
}

export default function SettingsClient({ providers, prices }: { providers: Provider[]; prices: Prices }) {
  const [providerState, setProviderState] = useState<Record<string, boolean>>(
    Object.fromEntries(providers.map((p) => [p.id, p.enabled]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function toggleProvider(id: string) {
    const newVal = !providerState[id];
    setSaving(id);
    await fetch(`/api/admin/settings/payment-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: newVal }),
    });
    setProviderState((prev) => ({ ...prev, [id]: newVal }));
    setSaving(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-black mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">Payment providers and business configuration.</p>
      </div>

      {/* Payment providers */}
      <section>
        <h2 className="font-bold text-lg mb-4">Payment Providers</h2>
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="glass border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold capitalize">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Mode: {p.mode}{p.regions?.length > 0 ? ` · Regions: ${p.regions.join(", ")}` : ""}
                </div>
              </div>
              <button
                onClick={() => toggleProvider(p.id)}
                disabled={saving === p.id}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  providerState[p.id]
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {saving === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved === p.id ? (
                  <Save className="w-4 h-4" />
                ) : null}
                {providerState[p.id] ? "Active" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Package prices — read-only (change via .env + redeploy) */}
      <section>
        <h2 className="font-bold text-lg mb-1">Package Prices</h2>
        <div className="flex items-center gap-2 mb-4 text-sm text-amber-400">
          <Info className="w-4 h-4 flex-shrink-0" />
          Prices are controlled via environment variables on the VPS. Edit <code className="font-mono mx-1 text-xs">.env</code> and restart PM2 to change.
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(prices).map(([pkg, price]) => (
            <div key={pkg} className="glass border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{pkg}</div>
              <div className="text-2xl font-black">${price}</div>
              <div className="text-xs text-muted-foreground mt-1">USD base</div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="font-bold text-lg mb-4 text-red-400">Danger Zone</h2>
        <div className="glass border border-red-500/20 rounded-2xl p-5 space-y-2">
          <div className="text-sm text-muted-foreground">
            Destructive actions (wipe data, clear queue, etc.) must be performed directly on the VPS via <code className="font-mono text-xs">psql</code> or <code className="font-mono text-xs">redis-cli</code>. They are intentionally not exposed here.
          </div>
        </div>
      </section>
    </div>
  );
}
