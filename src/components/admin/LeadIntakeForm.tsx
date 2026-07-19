"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";

export default function LeadIntakeForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/leads/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), source: form.get("source") }) });
    const data = await response.json();
    setBusy(false);
    if (response.ok) window.location.reload(); else setMessage(data.error || "Could not save lead");
  }

  return (
    <div>
      {!open && <button onClick={() => setOpen(true)} className="gold-gradient inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-black min-[480px]:w-auto"><Plus className="h-4 w-4" /> Paste inbound lead</button>}
      {open && (
        <form onSubmit={submit} className="dashboard-panel p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">Manual intake</div><h2 className="mt-2 text-xl font-black tracking-[-.02em]">Score a new opportunity</h2><p className="mt-1 text-sm text-white/35">Paste the real request. The bot scores and drafts; you decide what happens next.</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/50" aria-label="Close lead intake"><X className="h-4 w-4" /></button></div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]"><label className="text-xs font-semibold uppercase tracking-wider text-white/35">Job title<input name="title" required placeholder="YouTube video editor needed" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-base normal-case tracking-normal text-white" /></label><label className="text-xs font-semibold uppercase tracking-wider text-white/35">Source<select name="source" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-base normal-case tracking-normal text-white"><option value="manual">Manual paste</option><option value="email">Inbound email</option><option value="rss">Approved RSS</option><option value="freelancer_api">Freelancer API</option></select></label></div>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-white/35">Client request<textarea name="description" required minLength={20} rows={5} placeholder="Paste the complete request, deliverables, deadline, and budget…" className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base font-normal normal-case leading-6 tracking-normal text-white" /></label>
          {message && <p role="alert" className="mt-3 text-sm text-rose-300">{message}</p>}
          <div className="mt-4 flex justify-end"><button disabled={busy} className="gold-gradient inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-black disabled:opacity-40 min-[480px]:w-auto"><Sparkles className="h-4 w-4" />{busy ? "Scoring…" : "Score and draft proposal"}</button></div>
        </form>
      )}
    </div>
  );
}
