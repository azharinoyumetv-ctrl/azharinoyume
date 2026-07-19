import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="dashboard-hero relative overflow-hidden rounded-[1.75rem] border border-white/10 p-5 sm:p-7 lg:p-8">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="dashboard-eyebrow">{eyebrow}</span>
            {badge}
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">{title}</h1>
          <div className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">{description}</div>
        </div>
        {actions && <div className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:flex-row">{actions}</div>}
      </div>
    </header>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "gold",
  detail,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "gold" | "blue" | "violet" | "green" | "rose";
  detail?: ReactNode;
}) {
  const tones = {
    gold: "border-gold-500/20 bg-gold-500/10 text-gold-400",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  };

  return (
    <article className="dashboard-panel dashboard-panel-hover min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</div>
          <div className="mt-3 break-words text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{value}</div>
          {detail && <div className="mt-2 text-xs leading-5 text-white/40">{detail}</div>}
        </div>
        <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  pulse = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "blue" | "violet" | "green" | "red";
  pulse?: boolean;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-white/55",
    gold: "border-gold-500/20 bg-gold-500/10 text-gold-400",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    red: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  };

  return (
    <span className={cn("inline-flex min-h-7 items-center gap-2 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.14em]", tones[tone])}>
      {pulse && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" /></span>}
      {children}
    </span>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.02em] text-white sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-xs text-white/40 sm:text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
