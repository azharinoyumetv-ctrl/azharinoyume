"use client";

import { Loader2, Rss } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RssConnectorForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorType: "rss_feed",
          name: form.get("name"),
          feedUrl: form.get("feedUrl"),
          attribution: form.get("attribution"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "RSS connector could not be created");
      event.currentTarget.reset();
      setFeedback("RSS source saved. Test it, then enable collection.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "RSS connector could not be created");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="dashboard-panel mb-5 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-300/10 text-orange-200">
          <Rss className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-bold">Add an approved RSS feed</h3>
          <p className="text-xs text-white/35">The source stays disabled until its live feed passes a connection test.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_2fr_1fr_auto]">
        <input name="name" required maxLength={100} placeholder="Source name" className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/40" />
        <input name="feedUrl" required type="url" placeholder="https://example.com/jobs/feed.xml" className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/40" />
        <input name="attribution" required maxLength={100} placeholder="Publisher" className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan-300/40" />
        <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-400/15 px-5 text-xs font-black text-gold-200 disabled:opacity-40">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save feed
        </button>
      </div>
      {feedback && <p className="mt-3 text-xs text-white/60">{feedback}</p>}
    </form>
  );
}
