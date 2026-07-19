"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, CreditCard, FileText, BarChart3,
  Star, Briefcase, Settings, Upload, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Invoices", href: "/admin/invoices", icon: FileText },
  { label: "Accounting", href: "/admin/accounting", icon: BarChart3 },
  { label: "Job Leads", href: "/admin/leads", icon: Briefcase },
  { label: "Gig Drafts", href: "/admin/gigs", icon: Upload },
  { label: "Testimonials", href: "/admin/testimonials", icon: Star },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <><aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/5 hidden lg:flex flex-col z-40">
      <div className="p-6 border-b border-white/5">
        <div className="text-lg font-black">
          <span className="gold-text">azhari</span>
          <span className="text-white">noyume</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Admin Dashboard</div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
              pathname === href || pathname.startsWith(href + "/")
                ? "gold-gradient text-black font-semibold"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside><nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden glass border-t border-white/10 flex overflow-x-auto px-2 py-2">{NAV.map(({label,href,icon:Icon}) => <Link key={href} href={href} className={cn("min-w-20 px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[10px]", pathname === href || pathname.startsWith(href + "/") ? "gold-gradient text-black" : "text-muted-foreground")}><Icon className="w-4 h-4"/>{label}</Link>)}</nav></>
  );
}
