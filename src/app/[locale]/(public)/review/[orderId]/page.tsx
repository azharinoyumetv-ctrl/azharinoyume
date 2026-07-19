"use client";

import { useState, use } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ReviewPage(props: { params: Promise<{ orderId: string }> }) {
  const params = use(props.params);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    reviewText: "",
    consentShowVideo: false,
    consentShowPrompt: false,
    consentHideName: false,
    consentHideBrand: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/testimonials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: params.orderId, ...form }),
    });
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="flex min-h-[calc(100svh-4rem-env(safe-area-inset-top))] items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
          <h1 className="text-3xl font-black mb-4">Thank You!</h1>
          <p className="text-muted-foreground">Your review has been submitted. It will appear on our website after approval.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:py-20 lg:py-24">
      <h1 className="mb-2 text-3xl font-black sm:text-4xl">Leave a Review</h1>
      <p className="text-muted-foreground mb-8">Your feedback is completely optional. You control what we share.</p>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Your Review</label>
          <textarea
            value={form.reviewText}
            onChange={(e) => setForm((f) => ({ ...f, reviewText: e.target.value }))}
            required
            rows={5}
            placeholder="How was your experience with Azyume Cut AI?"
            className="glass w-full resize-none rounded-xl border border-white/10 px-4 py-3 text-base focus:border-gold-500/50 focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Consent (optional)</div>
          {[
            { key: "consentShowVideo", label: "Show my final video on the website" },
            { key: "consentShowPrompt", label: "Show my editing prompt" },
            { key: "consentHideName", label: "Hide my name (show as Anonymous)" },
            { key: "consentHideBrand", label: "Hide my brand/company name" },
          ].map(({ key, label }) => (
            <label key={key} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-1">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                className="h-5 w-5 rounded"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !form.reviewText.trim()}
          className="gold-gradient flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-black disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Review
        </button>

        <p className="text-xs text-muted-foreground text-center">
          All reviews are reviewed by admin before publishing. We never share your video or details without consent.
        </p>
      </form>
    </div>
  );
}
