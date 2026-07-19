"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const callbackUrl = searchParams.get("callbackUrl") || "/portal";
    const result = await signIn("email", { email, callbackUrl, redirect: false });

    if (result?.error) {
      setError("We could not send the sign-in link. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100svh-4rem-env(safe-area-inset-top))] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-black mb-2">
            <span className="gold-text">Azyume</span><span> Cut AI</span>
          </div>
          <p className="text-muted-foreground text-sm">Secure sign in for customers and administrators</p>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5 sm:p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-muted-foreground">We sent a one-time sign-in link to {email}. It expires in 15 minutes.</p>
              <button onClick={() => setSent(false)} className="min-h-12 rounded-lg px-3 text-sm text-gold-400">Use another email</button>
            </div>
          ) : <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass min-h-12 w-full rounded-xl border border-white/10 px-4 py-3 text-base focus:border-gold-500/50 focus:outline-none"
              />
            </div>
            {error && <div role="alert" className="text-center text-sm text-red-400">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="gold-gradient flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 font-bold text-black disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Email me a sign-in link
            </button>
          </form>}
        </div>
      </div>
    </div>
  );
}
