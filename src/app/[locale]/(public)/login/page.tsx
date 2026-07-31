"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";

type LoginMode = "password" | "magic";

function safeCallbackUrl(value: string | null, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(() =>
    searchParams.get("mode") === "magic" ? "magic" : "password",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handlePasswordLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"), "/admin");
    const result = await signIn("credentials", { email, password, callbackUrl, redirect: false });
    setLoading(false);
    if (!result?.ok || result.error) {
      setError("The email or password is incorrect.");
      return;
    }
    window.location.assign(callbackUrl);
  }

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"), "/portal");
    const result = await signIn("email", { email, callbackUrl, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("We could not send the sign-in link. Please try again.");
      return;
    }
    setSent(true);
  }

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError("");
    setSent(false);
  }

  return (
    <div className="dashboard-backdrop flex min-h-[calc(100svh-4rem-env(safe-area-inset-top))] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-2 text-3xl font-black tracking-[-0.04em]"><span className="gold-text">Azyume</span><span> Cut AI</span></div>
          <p className="text-sm text-white/40">Secure access for customers and administrators</p>
        </div>

        <div className="dashboard-panel overflow-hidden p-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1" role="tablist" aria-label="Sign-in method">
            <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => changeMode("password")} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${mode === "password" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/65"}`}><KeyRound className="h-4 w-4" /> Password</button>
            <button type="button" role="tab" aria-selected={mode === "magic"} onClick={() => changeMode("magic")} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${mode === "magic" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/65"}`}><Mail className="h-4 w-4" /> Email link</button>
          </div>

          <div className="p-4 sm:p-6">
            {sent ? (
              <div className="space-y-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400"><Mail className="h-5 w-5" /></span>
                <div><h1 className="text-xl font-bold">Check your email</h1><p className="mt-2 text-sm leading-6 text-white/40">We sent a one-time sign-in link to <span className="break-all text-white/70">{email}</span>. It expires in 15 minutes.</p></div>
                <button onClick={() => setSent(false)} className="dashboard-action w-full">Use another email</button>
              </div>
            ) : (
              <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink} className="space-y-4">
                <div><h1 className="text-xl font-black tracking-[-0.02em]">{mode === "password" ? "Password sign in" : "Email me a secure link"}</h1><p className="mt-1 text-sm leading-5 text-white/35">{mode === "password" ? "Use the email and password for your customer or administrator account." : "No password required. The link can be used once."}</p></div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Email<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-base font-normal normal-case tracking-normal text-white focus:border-gold-500/40 focus:outline-none" /></label>
                {mode === "password" && <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Password<span className="relative mt-2 block"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256} className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 pr-14 text-base font-normal normal-case tracking-normal text-white focus:border-gold-500/40 focus:outline-none" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-1 flex w-12 items-center justify-center text-white/35 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>}
                {error && <div role="alert" className="rounded-xl border border-rose-400/15 bg-rose-400/5 p-3 text-center text-sm text-rose-300">{error}</div>}
                <button type="submit" disabled={loading} className="gold-gradient flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 font-bold text-black disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "password" ? "Sign in" : "Email me a sign-in link"}</button>
                {mode === "password" && (
                  <p className="text-center text-sm text-white/35">
                    New to Azyume Studio?{" "}
                    <Link
                      href={`/register?callbackUrl=${encodeURIComponent(safeCallbackUrl(searchParams.get("callbackUrl"), "/portal"))}`}
                      className="font-semibold text-gold-300"
                    >
                      Create an account
                    </Link>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-5 text-white/25">Password attempts are rate-limited. Login errors never reveal whether an account exists.</p>
      </div>
    </div>
  );
}
