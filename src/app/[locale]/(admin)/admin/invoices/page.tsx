import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-white/5 text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-400",
  paid: "bg-green-500/10 text-green-400",
  overdue: "bg-red-500/10 text-red-400",
  void: "bg-white/5 text-muted-foreground line-through",
};

export default async function AdminInvoicesPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  const where = searchParams.status ? { status: searchParams.status } : {};

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { order: { select: { orderNumber: true, customerEmail: true } } },
  });

  const counts = await prisma.invoice.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  const filters = ["", "draft", "sent", "paid", "overdue", "void"];

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Invoices</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f}
            href={f ? `?status=${f}` : "?"}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              (searchParams.status || "") === f
                ? "bg-white/10 text-white"
                : "bg-white/5 text-muted-foreground hover:bg-white/8"
            }`}
          >
            {f || "All"}{" "}
            {countMap[f] !== undefined && (
              <span className="ml-1 text-xs opacity-70">({countMap[f]})</span>
            )}
          </Link>
        ))}
      </div>

      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
        <div className="scrollbar-thin overscroll-x overflow-x-auto">
          <table className="admin-table w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4 text-left">Invoice #</th>
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Method</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Due / Paid</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/orders/${inv.orderId}`} className="hover:text-gold-400 transition-colors">
                      {inv.order?.orderNumber || "—"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{inv.order?.customerEmail || "—"}</td>
                  <td className="px-6 py-4 capitalize">{inv.paymentMethod}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(Number(inv.total), inv.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status] || "bg-white/5"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {inv.paidAt ? (
                      <span className="text-green-400">{formatDate(inv.paidAt)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/api/invoice/${inv.id}/pdf`}
                      target="_blank"
                      className="text-xs text-muted-foreground hover:text-white transition-colors"
                    >
                      PDF
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
