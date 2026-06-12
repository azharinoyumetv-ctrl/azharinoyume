import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { orderNumber: { contains: searchParams.q, mode: "insensitive" } },
      { customerEmail: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { invoices: { take: 1 }, profitReport: true },
  });

  const STATUS_COLORS: Record<string, string> = {
    delivered: "text-green-400 bg-green-500/10",
    draft_ready: "text-gold-400 bg-gold-500/10",
    failed: "text-red-400 bg-red-500/10",
    awaiting_payment: "text-muted-foreground bg-white/5",
    processing: "text-blue-400 bg-blue-500/10",
    revision_requested: "text-violet-400 bg-violet-500/10",
  };

  const STATUSES = ["all","awaiting_payment","processing","editing_started","draft_ready","revision_requested","delivered","failed"];

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Orders</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              (s === "all" && !searchParams.status) || searchParams.status === s
                ? "gold-gradient text-black" : "glass border border-white/10 text-muted-foreground hover:text-white"
            }`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Package</th>
                <th className="px-6 py-4 text-left">Total</th>
                <th className="px-6 py-4 text-left">Margin</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order) => {
                const margin = order.profitReport ? Number(order.profitReport.profitMargin).toFixed(1) : null;
                const statusClass = STATUS_COLORS[order.status] || "text-muted-foreground bg-white/5";
                return (
                  <tr key={order.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-gold-400 transition-colors">
                        {order.orderNumber}
                      </Link>
                      {order.manualReviewRequired && !order.adminApproved && (
                        <div className="text-xs text-amber-400 mt-0.5">⚠ Wise review</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{order.customerEmail}</td>
                    <td className="px-6 py-4 font-medium">{order.package.toUpperCase()}</td>
                    <td className="px-6 py-4 font-bold">{formatCurrency(Number(order.totalPrice))}</td>
                    <td className="px-6 py-4">
                      {margin ? (
                        <span className={`font-bold ${parseFloat(margin) >= 80 ? "text-green-400" : parseFloat(margin) >= 70 ? "text-gold-400" : "text-red-400"}`}>
                          {margin}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
