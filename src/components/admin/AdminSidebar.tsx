"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Star,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operate",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    ],
  },
  {
    label: "Acquire",
    items: [
      { label: "Job Leads", href: "/admin/leads", icon: Briefcase },
      { label: "Gig Drafts", href: "/admin/gigs", icon: Upload },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Invoices", href: "/admin/invoices", icon: FileText },
      { label: "Accounting", href: "/admin/accounting", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Testimonials", href: "/admin/testimonials", icon: Star },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
] ;

const ALL_NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
const MOBILE_NAV: NavItem[] = [ALL_NAV[0], ALL_NAV[1], ALL_NAV[2], ALL_NAV[3]];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [moreOpen]);

  const isActive = (href: string) => pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/10 bg-[#09090b]/[.92] pt-[env(safe-area-inset-top)] backdrop-blur-2xl min-[900px]:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/admin" className="flex min-h-12 items-center gap-3 rounded-xl">
            <span className="gold-gradient flex h-10 w-10 items-center justify-center rounded-xl text-black shadow-[0_0_30px_rgba(212,160,23,.18)]">
              <Bot className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">Azyume OS</span>
              <span className="mt-0.5 block truncate text-base font-black tracking-[-0.02em] text-white">Bot Control</span>
            </span>
          </Link>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4" aria-label="Admin navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">{group.label}</div>
              <div className="space-y-1">
                {group.items.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm transition-all",
                      isActive(href)
                        ? "border border-gold-500/15 bg-gold-500/10 font-semibold text-white"
                        : "border border-transparent text-white/45 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {isActive(href) && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold-400" />}
                    <Icon className={cn("h-4 w-4 flex-shrink-0", isActive(href) ? "text-gold-400" : "text-white/35 group-hover:text-white/70")} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/75"><Activity className="h-3.5 w-3.5 text-emerald-400" /> Human-in-the-loop</div>
            <p className="mt-1.5 text-[10px] leading-4 text-white/35">AI drafts and scores. You approve every external action.</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/40 transition-all hover:bg-rose-400/5 hover:text-rose-300">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-end border-b border-white/10 bg-[#09090b]/[.92] px-4 pb-2 backdrop-blur-2xl min-[900px]:hidden">
        <div className="flex h-12 w-full items-center justify-between">
          <Link href="/admin" className="flex min-h-12 items-center gap-2.5">
            <span className="gold-gradient flex h-9 w-9 items-center justify-center rounded-xl text-black"><Bot className="h-4 w-4" /></span>
            <span><span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-gold-400">Azyume OS</span><span className="block text-sm font-black text-white">Bot Control</span></span>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Review mode</span>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#09090b]/[.94] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl min-[900px]:hidden" aria-label="Admin mobile navigation">
        {MOBILE_NAV.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] leading-tight", isActive(href) ? "bg-gold-500/10 font-semibold text-gold-400" : "text-white/35")}>
            <Icon className="h-5 w-5" /><span className="max-w-full truncate">{label.replace("Job ", "")}</span>
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] leading-tight", moreOpen || ALL_NAV.slice(4).some((item) => isActive(item.href)) ? "bg-gold-500/10 font-semibold text-gold-400" : "text-white/35")}>
          <MoreHorizontal className="h-5 w-5" /><span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] min-[900px]:hidden">
          <button className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm" onClick={() => setMoreOpen(false)} aria-label="Close more navigation" />
          <div className="dashboard-panel absolute inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] max-h-[78dvh] overflow-y-auto rounded-[1.75rem] bg-[#0d0d10] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between px-1">
              <div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">Navigation</div><div className="mt-1 text-lg font-black text-white">More tools</div></div>
              <button onClick={() => setMoreOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-white/60" aria-label="Close more navigation"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_NAV.slice(4).map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={cn("flex min-h-20 flex-col justify-between rounded-2xl border p-3 text-sm font-semibold", isActive(href) ? "border-gold-500/20 bg-gold-500/10 text-gold-400" : "border-white/10 bg-white/[0.025] text-white/65")}>
                  <Icon className="h-5 w-5" />{label}
                </Link>
              ))}
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/15 text-sm font-semibold text-rose-300"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      )}
    </>
  );
}
