import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { AlertCircle, TrendingUp, ShoppingBag, Clock } from "lucide-react";

async function getDashboardStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders, activeOrders, pendingReview, todayRevenue, monthRevenue,
    recentOrders, costWarnings,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["QUEUED", "RENDERING", "DRAFT_REVIEW", "REVISION_REQUESTED"] } } }),
    prisma.order.count({ where: { manualReviewRequired: true, adminApproved: false } }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfDay } }, _sum: { idrAmount: true } }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfMonth } }, _sum: { idrAmount: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { invoices: { take: 1 } } }),
    prisma.profitReport.findMany({ where: { costCapUsedPct: { gte: 15 } }, include: { order: true }, orderBy: { calculatedAt: "desc" }, take: 5 }),
  ]);

  return { totalOrders, activeOrders, pendingReview, todayRevenue: Number(todayRevenue._sum.idrAmount || 0), monthRevenue: Number(monthRevenue._sum.idrAmount || 0), recentOrders, costWarnings };
}

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Good to see you. Here&apos;s what&apos;s happening.</p>

      {/* Human-review alert */}
      {stats.pendingReview > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-8">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="font-semibold text-amber-400">{stats.pendingReview} order{stats.pendingReview > 1 ? "s" : ""} need human review</div>
            <div className="text-sm text-amber-400/70">Review flagged renders, disputes, and exceptional payment cases.</div>
          </div>
          <Link href="/admin/orders?filter=review" className="ml-auto px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold">
            Review Now
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue, "IDR"), icon: TrendingUp, color: "text-green-400" },
          { label: "Month Revenue", value: formatCurrency(stats.monthRevenue, "IDR"), icon: TrendingUp, color: "text-gold-400" },
          { label: "Active Orders", value: stats.activeOrders, icon: ShoppingBag, color: "text-blue-400" },
          { label: "Total Orders", value: stats.totalOrders, icon: Clock, color: "text-violet-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass border border-white/5 rounded-2xl p-6">
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <div className="text-2xl font-black">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Cost warnings */}
      {stats.costWarnings.length > 0 && (
        <div className="glass border border-red-500/20 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Cost Cap Warnings
          </h2>
          <div className="space-y-3">
            {stats.costWarnings.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <Link href={`/admin/orders/${r.orderId}`} className="hover:text-gold-400 transition-colors">
                  {r.order.orderNumber}
                </Link>
                <div className={`font-bold ${Number(r.costCapUsedPct) >= 20 ? "text-red-400" : "text-amber-400"}`}>
                  {Number(r.costCapUsedPct).toFixed(1)}% of cap used
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="font-bold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-gold-400 hover:text-gold-300 transition-colors">View all →</Link>
        </div>
        <div className="divide-y divide-white/5">
          {stats.recentOrders.map((order) => {
            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-white/2 transition-colors">
                <div>
                  <div className="font-medium text-sm">{order.orderNumber}</div>
                  <div className="text-xs text-muted-foreground">{order.customerEmail} · {order.package.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatCurrency(Number(order.totalPrice))}</div>
                  <div className={`text-xs mt-0.5 ${
                    order.status === "DELIVERED" ? "text-green-400" :
                    order.status === "DRAFT_REVIEW" ? "text-gold-400" :
                    order.manualReviewRequired ? "text-amber-400" :
                    "text-muted-foreground"
                  }`}>
                    {order.status.replace(/_/g, " ")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
