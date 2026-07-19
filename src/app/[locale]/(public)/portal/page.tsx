import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Coins,
  Download,
  FolderOpen,
  Plus,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import EnableNotifications from "@/components/EnableNotifications";
import { DashboardHeader, MetricCard, SectionHeader, StatusPill } from "@/components/dashboard/DashboardPrimitives";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "neutral" | "gold" | "blue" | "violet" | "green" | "red"; progress: number; message: string }> = {
  DRAFT_UPLOAD: { label: "Upload", tone: "neutral", progress: 8, message: "Waiting for your source footage" },
  QUEUED: { label: "Queued", tone: "gold", progress: 24, message: "Credits reserved and project queued" },
  RENDERING: { label: "Rendering", tone: "blue", progress: 56, message: "AI edit is being assembled" },
  DRAFT_REVIEW: { label: "Review ready", tone: "violet", progress: 78, message: "Your draft is ready for feedback" },
  REVISION_REQUESTED: { label: "Revising", tone: "blue", progress: 84, message: "Requested changes are in progress" },
  DELIVERED: { label: "Delivered", tone: "green", progress: 100, message: "Final video is ready" },
  RENDER_FAILED: { label: "Needs attention", tone: "red", progress: 100, message: "We are reviewing the render" },
};

export default async function PortalPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [orders, wallet] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        invoices: { take: 1, orderBy: { createdAt: "desc" } },
        deliveryLinks: { where: { expiresAt: { gt: new Date() } }, take: 1 },
        renders: { orderBy: { id: "desc" }, take: 1 },
      },
    }),
    prisma.wallet.findUnique({ where: { userId: session.user.id } }),
  ]);

  const activeOrders = orders.filter((order) => !["DELIVERED", "RENDER_FAILED"].includes(order.status)).length;
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED").length;
  const featured = orders.find((order) => !["DELIVERED", "RENDER_FAILED"].includes(order.status)) || orders[0];
  const featuredStatus = featured ? STATUS[featured.status] || STATUS.DRAFT_UPLOAD : null;

  return (
    <div className="dashboard-backdrop min-h-[calc(100svh-4rem-env(safe-area-inset-top))] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-8">
        <DashboardHeader
          eyebrow="Video workspace"
          title="Your creative studio"
          description={<>Projects, revisions, downloads, and credits in one focused workspace. Signed in as <span className="break-all text-white/75">{session.user.email}</span>.</>}
          badge={<StatusPill tone="green" pulse>Private workspace</StatusPill>}
          actions={
            <>
              <Link href="/portal/billing" className="dashboard-action"><Coins className="h-4 w-4" /> Billing</Link>
              <Link href="/order" className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-[.875rem] px-4 text-sm font-bold text-black"><Plus className="h-4 w-4" /> New project</Link>
            </>
          }
        />

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Available credits" value={(wallet?.availableCredits || 0).toLocaleString()} icon={Coins} tone="gold" detail={`${(wallet?.reservedCredits || 0).toLocaleString()} reserved`} />
          <MetricCard label="Active projects" value={activeOrders} icon={WandSparkles} tone="blue" detail="In your production queue" />
          <MetricCard label="Delivered" value={deliveredOrders} icon={CheckCircle2} tone="green" detail={`${orders.length} total projects`} />
          <article className="dashboard-panel dashboard-panel-hover col-span-2 flex min-h-[8.5rem] flex-col justify-between p-4 lg:col-span-1 sm:p-5">
            <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Stay updated</span><Sparkles className="h-4 w-4 text-violet-300" /></div>
            <EnableNotifications />
          </article>
        </section>

        {featured && featuredStatus && (
          <section>
            <SectionHeader title="Now in the studio" description="Your most relevant active project" />
            <article className="dashboard-panel relative overflow-hidden p-5 sm:p-7">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-gold-500/10 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
                <div className="min-w-0">
                  <div className="mb-5 flex flex-wrap items-center gap-3"><StatusPill tone={featuredStatus.tone} pulse={featured.status === "RENDERING"}>{featuredStatus.label}</StatusPill><span className="text-xs text-white/35">Started {formatDate(featured.createdAt)}</span></div>
                  <Link href={`/order/${featured.id}`} className="group inline-flex min-w-0 items-center gap-3 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400"><Clapperboard className="h-5 w-5" /></span>
                    <span className="truncate group-hover:text-gold-300">{featured.orderNumber}</span>
                  </Link>
                  <p className="mt-3 text-sm text-white/45">{featuredStatus.message} · <span className="capitalize">{featured.package} / {featured.visualStyle}</span></p>
                  <div className="mt-6 max-w-2xl"><div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-white/35"><span>Production progress</span><span className="text-white/65">{featuredStatus.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-violet-400 shadow-[0_0_18px_rgba(245,200,66,.28)]" style={{ width: `${featuredStatus.progress}%` }} /></div></div>
                </div>
                <div className="grid gap-2 min-[480px]:grid-cols-2 lg:grid-cols-1">
                  <Link href={`/order/${featured.id}`} className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-black">Open project <ArrowRight className="h-4 w-4" /></Link>
                  {featured.deliveryLinks[0]?.r2Key && ["DRAFT_REVIEW", "DELIVERED"].includes(featured.status) && <a href={`/api/v1/orders/${featured.id}/download`} target="_blank" rel="noopener noreferrer" className="dashboard-action"><Download className="h-4 w-4" /> Download video</a>}
                </div>
              </div>
            </article>
          </section>
        )}

        <section>
          <SectionHeader title="Project library" description="Every edit, revision, and delivery" action={orders.length > 0 ? <Link href="/order" className="text-xs font-semibold text-gold-400">New project +</Link> : undefined} />
          {orders.length === 0 ? (
            <div className="dashboard-panel flex min-h-[22rem] flex-col items-center justify-center p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-500/15 bg-gold-500/10 text-gold-400"><FolderOpen className="h-7 w-7" /></span>
              <h2 className="mt-6 text-2xl font-black tracking-[-0.03em]">Your first edit starts here</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">Upload your footage, choose an editing style, and follow the complete production journey from this workspace.</p>
              <Link href="/order" className="gold-gradient mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold text-black min-[480px]:w-auto"><Plus className="h-4 w-4" /> Create first project</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {orders.map((order) => {
                const status = STATUS[order.status] || STATUS.DRAFT_UPLOAD;
                const invoice = order.invoices[0];
                const delivery = order.deliveryLinks[0];
                return (
                  <article key={order.id} className="dashboard-panel dashboard-panel-hover flex min-h-[20rem] flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[.02] text-white/55"><Clapperboard className="h-5 w-5" /></span>
                      <StatusPill tone={status.tone} pulse={order.status === "RENDERING"}>{status.label}</StatusPill>
                    </div>
                    <div className="mt-5 min-w-0"><Link href={`/order/${order.id}`} className="block truncate text-lg font-black tracking-[-0.02em] text-white hover:text-gold-300">{order.orderNumber}</Link><p className="mt-1 truncate text-xs capitalize text-white/35">{order.package} · {order.visualStyle}</p></div>
                    <p className="mt-5 text-sm leading-6 text-white/45">{status.message}</p>
                    <div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-violet-400" style={{ width: `${status.progress}%` }} /></div></div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-6"><div className="text-[10px] uppercase tracking-[0.14em] text-white/30"><Clock3 className="mr-1 inline h-3 w-3" />{formatDate(order.createdAt)}</div><div className="flex gap-2"><Link href={`/order/${order.id}`} aria-label={`Open ${order.orderNumber}`} className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:border-gold-500/20 hover:text-gold-400"><ArrowRight className="h-4 w-4" /></Link>{invoice?.status.toUpperCase() === "PAID" && delivery?.r2Key && <a href={`/api/v1/orders/${order.id}/download`} target="_blank" rel="noopener noreferrer" aria-label={`Download ${order.orderNumber}`} className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/15 text-emerald-300"><Download className="h-4 w-4" /></a>}</div></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
