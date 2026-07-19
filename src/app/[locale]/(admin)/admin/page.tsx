import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  RadioTower,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { DashboardHeader, MetricCard, SectionHeader, StatusPill } from "@/components/dashboard/DashboardPrimitives";

async function getDashboardStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    activeOrders,
    pendingReview,
    todayRevenue,
    monthRevenue,
    recentOrders,
    costWarnings,
    hotLeads,
    activeLeads,
    draftGigs,
    recentLeads,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["QUEUED", "RENDERING", "DRAFT_REVIEW", "REVISION_REQUESTED"] } } }),
    prisma.order.count({ where: { manualReviewRequired: true, adminApproved: false } }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfDay } }, _sum: { idrAmount: true } }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfMonth } }, _sum: { idrAmount: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.profitReport.findMany({ where: { costCapUsedPct: { gte: 15 } }, include: { order: true }, orderBy: { calculatedAt: "desc" }, take: 4 }),
    prisma.jobLead.count({ where: { score: { gte: 80 }, pipelineStatus: { notIn: ["won", "lost"] } } }),
    prisma.jobLead.count({ where: { pipelineStatus: { notIn: ["won", "lost"] } } }),
    prisma.gigDraft.count({ where: { status: "DRAFT" } }),
    prisma.jobLead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return {
    totalOrders,
    activeOrders,
    pendingReview,
    todayRevenue: Number(todayRevenue._sum.idrAmount || 0),
    monthRevenue: Number(monthRevenue._sum.idrAmount || 0),
    recentOrders,
    costWarnings,
    hotLeads,
    activeLeads,
    draftGigs,
    recentLeads,
  };
}

function orderTone(status: string): "neutral" | "gold" | "blue" | "violet" | "green" | "red" {
  if (status === "DELIVERED") return "green";
  if (status === "RENDERING") return "blue";
  if (status === "DRAFT_REVIEW") return "violet";
  if (status === "RENDER_FAILED") return "red";
  if (status === "QUEUED") return "gold";
  return "neutral";
}

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 sm:space-y-8">
      <DashboardHeader
        eyebrow="Bot operations"
        title="Command center"
        description="One view for acquisition, production, money, and every decision that still needs a human. Automation prepares the work; nothing external ships without your approval."
        badge={<StatusPill tone="green" pulse>Review gated</StatusPill>}
        actions={
          <>
            <Link href="/admin/leads" className="dashboard-action"><BriefcaseBusiness className="h-4 w-4" /> Review leads</Link>
            <Link href="/admin/gigs" className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-[.875rem] px-4 text-sm font-bold text-black"><Sparkles className="h-4 w-4" /> Create gig draft</Link>
          </>
        }
      />

      {stats.pendingReview > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 sm:p-5">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><AlertCircle className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><div className="font-bold text-amber-200">{stats.pendingReview} operator decision{stats.pendingReview === 1 ? "" : "s"} waiting</div><p className="mt-1 text-sm text-amber-200/55">Flagged renders, payment exceptions, and quality checks remain paused.</p></div>
            <Link href="/admin/orders?filter=review" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-black">Open review queue <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Operational pulse" description="Live workload across the bot and editing pipeline" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Active orders" value={stats.activeOrders} icon={RadioTower} tone="blue" detail={`${stats.totalOrders} lifetime`} />
          <MetricCard label="Hot leads" value={stats.hotLeads} icon={BriefcaseBusiness} tone="violet" detail={`${stats.activeLeads} open leads`} />
          <MetricCard label="Gig drafts" value={stats.draftGigs} icon={Upload} tone="gold" detail="Ready to refine" />
          <MetricCard label="Human review" value={stats.pendingReview} icon={Bot} tone={stats.pendingReview > 0 ? "rose" : "green"} detail="Manual approval gate" />
          <MetricCard label="Today" value={formatCurrency(stats.todayRevenue, "IDR")} icon={TrendingUp} tone="green" detail="Paid revenue" />
          <MetricCard label="This month" value={formatCurrency(stats.monthRevenue, "IDR")} icon={CircleDollarSign} tone="gold" detail="Paid revenue" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]">
        <section className="dashboard-panel overflow-hidden">
          <div className="border-b border-white/10 p-4 sm:p-5">
            <SectionHeader title="Production queue" description="Newest customer projects and render state" action={<Link href="/admin/orders" className="text-xs font-semibold text-gold-400 hover:text-gold-300">View all →</Link>} />
          </div>
          <div className="divide-y divide-white/5">
            {stats.recentOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="group flex min-h-[4.75rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[.025] sm:px-5">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.025] text-white/45 group-hover:border-gold-500/20 group-hover:text-gold-400"><ShoppingBag className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{order.orderNumber}</span><span className="mt-1 block truncate text-xs text-white/35">{order.customerEmail} · {order.package.toUpperCase()}</span></span>
                <span className="hidden text-right sm:block"><span className="block text-sm font-bold text-white">{formatCurrency(Number(order.totalPrice))}</span><span className="mt-1 block text-[10px] text-white/30">{new Date(order.createdAt).toLocaleDateString()}</span></span>
                <StatusPill tone={orderTone(order.status)}>{order.status.replace(/_/g, " ")}</StatusPill>
              </Link>
            ))}
            {stats.recentOrders.length === 0 && <div className="p-10 text-center text-sm text-white/35">No production activity yet.</div>}
          </div>
        </section>

        <div className="space-y-6">
          <section className="dashboard-panel p-4 sm:p-5">
            <SectionHeader title="Acquisition inbox" description="Fresh opportunities entering the bot" action={<Link href="/admin/leads" className="text-xs font-semibold text-gold-400">Open board →</Link>} />
            <div className="space-y-2">
              {stats.recentLeads.map((lead) => (
                <Link key={lead.id} href="/admin/leads" className="flex min-h-16 items-center gap-3 rounded-xl border border-white/5 bg-white/[.018] px-3 py-2.5 transition-colors hover:border-violet-400/20">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300"><BriefcaseBusiness className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white/85">{lead.title}</span><span className="mt-1 block text-[10px] uppercase tracking-wider text-white/30">{lead.source} · {lead.pipelineStatus.replace(/_/g, " ")}</span></span>
                  <span className="text-sm font-black text-violet-300">{lead.score == null ? "—" : Number(lead.score).toFixed(0)}</span>
                </Link>
              ))}
              {stats.recentLeads.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-7 text-center text-sm text-white/35">New scored leads will appear here.</div>}
            </div>
          </section>

          <section className="dashboard-panel p-4 sm:p-5">
            <div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Automation policy</div><div className="mt-2 text-base font-bold text-white">Safe by design</div></div><StatusPill tone="green" pulse>Active</StatusPill></div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[{ label: "Score", icon: Sparkles }, { label: "Draft", icon: Bot }, { label: "Approve", icon: Clock3 }].map(({ label, icon: Icon }, index) => <div key={label} className="rounded-xl border border-white/5 bg-white/[.02] p-3"><Icon className={index === 2 ? "mx-auto h-4 w-4 text-gold-400" : "mx-auto h-4 w-4 text-white/45"} /><div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</div></div>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/35">Lead scoring and content drafting can run automatically. Applying, publishing, discounting, and payment decisions stay with you.</p>
          </section>
        </div>
      </div>

      {stats.costWarnings.length > 0 && (
        <section className="dashboard-panel border-rose-400/15 p-4 sm:p-5">
          <SectionHeader title="Margin watch" description="Projects approaching the configured cost cap" />
          <div className="grid gap-2 md:grid-cols-2">
            {stats.costWarnings.map((report) => (
              <Link key={report.id} href={`/admin/orders/${report.orderId}`} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-rose-400/10 bg-rose-400/5 px-3 text-sm">
                <span className="font-semibold text-white/75">{report.order.orderNumber}</span><span className={Number(report.costCapUsedPct) >= 20 ? "font-black text-rose-300" : "font-black text-amber-300"}>{Number(report.costCapUsedPct).toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
