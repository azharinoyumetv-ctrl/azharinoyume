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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-black mb-2">
            <span className="gold-text">azhari</span><span>noyume</span>
          </div>
          <p className="text-muted-foreground text-sm">Secure sign in for customers and administrators</p>
        </div>

        <div className="glass border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-muted-foreground">We sent a one-time sign-in link to {email}. It expires in 15 minutes.</p>
              <button onClick={() => setSent(false)} className="text-sm text-gold-400">Use another email</button>
            </div>
          ) : <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-sm focus:border-gold-500/50 focus:outline-none"
              />
            </div>
            {error && <div className="text-sm text-red-400 text-center">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 gold-gradient text-black font-bold rounded-xl disabled:opacity-50"
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
