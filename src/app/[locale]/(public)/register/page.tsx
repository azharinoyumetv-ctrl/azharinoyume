"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

function safeCallbackUrl(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/portal";
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error || "Account creation failed.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (!signInResult?.ok || signInResult.error) {
        setError("Your account was created. Sign in to continue.");
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setError("The service could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-backdrop flex min-h-[calc(100svh-4rem-env(safe-area-inset-top))] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-2 text-3xl font-black tracking-[-0.04em]">
            <span className="gold-text">Azyume</span> Studio
          </div>
          <p className="text-sm text-white/40">
            Create your private production workspace
          </p>
        </div>

        <form onSubmit={submit} className="dashboard-panel space-y-4 p-5 sm:p-7">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400">
              <UserPlus className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-xl font-black tracking-[-0.02em]">
              Create customer account
            </h1>
            <p className="mt-1 text-sm leading-5 text-white/35">
              Your brief, footage, invoices, drafts, and delivery remain attached
              to this account.
            </p>
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-base font-normal normal-case tracking-normal text-white focus:border-gold-500/40 focus:outline-none"
            />
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-base font-normal normal-case tracking-normal text-white focus:border-gold-500/40 focus:outline-none"
            />
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
            Password
            <span className="relative mt-2 block">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 pr-14 text-base font-normal normal-case tracking-normal text-white focus:border-gold-500/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-1 flex w-12 items-center justify-center text-white/35 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </span>
            <span className="mt-2 block text-[11px] font-normal normal-case tracking-normal text-white/30">
              At least 12 characters with uppercase, lowercase, and a number.
            </span>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/15 bg-rose-400/5 p-3 text-sm text-rose-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="gold-gradient flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 font-bold text-black disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account and continue
          </button>

          <p className="text-center text-sm text-white/35">
            Already have an account?{" "}
            <Link
              href={`/login?mode=password&callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-semibold text-gold-300"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
