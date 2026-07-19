"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Sparkles, Upload } from "lucide-react";
import { DashboardHeader, SectionHeader, StatusPill } from "@/components/dashboard/DashboardPrimitives";

type Draft = { id: string; platform: string; title: string; description: string; status: string; pricing: unknown; tags: unknown; faq: unknown };

export default function GigDraftsClient({ drafts }: { drafts: Draft[] }) {
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState("freelancer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/gig-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform, brief }) });
    const data = await response.json();
    setBusy(false);
    if (response.ok) window.location.reload(); else setError(data.error || "Generation failed");
  }

  async function submitted(id: string) {
    await fetch(`/api/admin/gig-drafts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "SUBMITTED" }) });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <DashboardHeader eyebrow="Acquisition bot" title="Gig studio" description="Turn a real service brief into marketplace-ready copy. AI prepares the draft; you review every claim and publish it manually." badge={<StatusPill tone="violet" pulse>Human reviewed</StatusPill>} />

      <section className="dashboard-panel p-4 sm:p-6">
        <SectionHeader title="Generate a truthful draft" description="Choose the destination and describe exactly what you can deliver" />
        <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Marketplace<select value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-base text-white sm:text-sm"><option value="freelancer">Freelancer</option><option value="fiverr">Fiverr</option><option value="upwork">Upwork</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Service brief<textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} placeholder="Describe the footage, result, turnaround, revisions, and any limits…" className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base leading-6 text-white placeholder:text-white/20" /></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/5 p-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-4 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between"><p className="text-xs leading-5 text-white/30">Drafts are saved privately and never posted automatically.</p><button disabled={busy || brief.length < 20} onClick={create} className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-black disabled:opacity-40"><Sparkles className="h-4 w-4" />{busy ? "Generating…" : "Generate draft"}</button></div>
      </section>

      <section>
        <SectionHeader title="Draft library" description={`${drafts.length} saved marketplace draft${drafts.length === 1 ? "" : "s"}`} />
        <div className="grid gap-4 xl:grid-cols-2">
          {drafts.map((draft) => (
            <article key={draft.id} className="dashboard-panel dashboard-panel-hover flex flex-col p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Upload className="h-4 w-4" /></span><div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">{draft.platform}</div><div className="mt-1"><StatusPill tone={draft.status === "SUBMITTED" ? "green" : "neutral"}>{draft.status}</StatusPill></div></div></div>{draft.status !== "SUBMITTED" && <button onClick={() => submitted(draft.id)} className="dashboard-action"><CheckCircle2 className="h-4 w-4" /> Mark submitted</button>}</div>
              <h2 className="mt-5 text-xl font-black tracking-[-0.025em] text-white">{draft.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/45">{draft.description}</p>
              <details className="group mt-5 rounded-xl border border-white/7 bg-black/20 p-3 text-sm"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between font-semibold text-white/60">Pricing, tags, and FAQ <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><pre className="scrollbar-thin mt-3 max-h-80 overflow-auto whitespace-pre-wrap border-t border-white/5 pt-3 text-xs leading-5 text-white/40">{JSON.stringify({ pricing: draft.pricing, tags: draft.tags, faq: draft.faq }, null, 2)}</pre></details>
            </article>
          ))}
          {drafts.length === 0 && <div className="dashboard-panel col-span-full flex min-h-56 flex-col items-center justify-center p-8 text-center"><Sparkles className="h-7 w-7 text-gold-400" /><h3 className="mt-4 text-lg font-bold">No drafts yet</h3><p className="mt-2 text-sm text-white/35">Your generated marketplace copy will collect here.</p></div>}
        </div>
      </section>
    </div>
  );
}
