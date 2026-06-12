import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import WiseApprovalCard from "@/components/admin/WiseApprovalCard";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const [transactions, wiseReview] = await Promise.all([
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { invoice: { include: { order: { select: { orderNumber: true, customerEmail: true } } } } },
    }),
    prisma.order.findMany({
      where: { manualReviewRequired: true, adminApproved: false },
      include: { invoices: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const STATUS_COLORS: Record<string, string> = {
    confirmed: "text-green-400 bg-green-500/10",
    manual_approved: "text-blue-400 bg-blue-500/10",
    failed: "text-red-400 bg-red-500/10",
    pending: "text-amber-400 bg-amber-500/10",
  };

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Payments</h1>

      {/* Wise approvals */}
      {wiseReview.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
            ⚠ Wise Payments Pending Manual Approval ({wiseReview.length})
          </h2>
          <div className="space-y-4">
            {wiseReview.map((order) => (
              <WiseApprovalCard key={order.id} order={JSON.parse(JSON.stringify(order))} />
            ))}
          </div>
        </div>
      )}

      {/* All transactions */}
      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-bold">All Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Provider</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/admin/orders/${tx.orderId}`} className="hover:text-gold-400 font-mono text-xs transition-colors">
                      {tx.invoice?.order?.orderNumber || tx.orderId.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{tx.invoice?.order?.customerEmail || "—"}</td>
                  <td className="px-6 py-4 font-medium capitalize">{tx.provider}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(Number(tx.amount), tx.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[tx.status] || "bg-white/5 text-muted-foreground"}`}>
                      {tx.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
