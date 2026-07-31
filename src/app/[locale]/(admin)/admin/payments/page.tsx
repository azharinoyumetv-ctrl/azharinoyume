import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import PayoneerApproval from "@/components/admin/PayoneerApproval";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PAID: "text-green-400 bg-green-500/10",
  PENDING_ACTION: "text-amber-400 bg-amber-500/10",
  FAILED: "text-red-400 bg-red-500/10",
  REFUNDED: "text-cyan-400 bg-cyan-500/10",
  CHARGEBACK: "text-red-300 bg-red-500/20",
  CANCELLED: "text-muted-foreground bg-white/5",
  EXPIRED: "text-muted-foreground bg-white/5",
};

export default async function AdminPaymentsPage() {
  const [payments, rejectedEvents] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } }, quote: { include: { product: true } } },
    }),
    // eslint-disable-next-line react-hooks/purity -- dynamic server-side operational window
    prisma.paymentEvent.count({ where: { status: "REJECTED", receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-black sm:text-4xl">Payments</h1><p className="mt-1 text-sm text-muted-foreground">DOKU, Xendit v3, Midtrans Snap, and reconciled Payoneer payments</p></div>
        {rejectedEvents > 0 && <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 text-sm">{rejectedEvents} rejected webhook event{rejectedEvents === 1 ? "" : "s"} in 24h</div>}
      </div>
      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
        <div className="scrollbar-thin overscroll-x overflow-x-auto">
          <table className="admin-table w-full text-sm">
            <thead className="border-b border-white/5"><tr className="text-xs text-muted-foreground uppercase tracking-wider"><th className="px-6 py-4 text-left">Reference</th><th className="px-6 py-4 text-left">Customer</th><th className="px-6 py-4 text-left">Product</th><th className="px-6 py-4 text-left">Gateway</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Action</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {payments.map((payment) => <tr key={payment.id} className="hover:bg-white/2"><td className="px-6 py-4 font-mono text-xs">{payment.referenceId}</td><td className="px-6 py-4 text-muted-foreground">{payment.user.email}</td><td className="px-6 py-4">{payment.quote.product.name}</td><td className="px-6 py-4 font-medium uppercase">{payment.provider}</td><td className="px-6 py-4 text-right font-bold">{payment.currency === "USD" ? `$${(payment.usdCents / 100).toFixed(2)}` : `Rp ${payment.idrAmount.toLocaleString("id-ID")}`}</td><td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[payment.status] || "bg-white/5"}`}>{payment.status.replace(/_/g, " ")}</span></td><td className="px-6 py-4 text-muted-foreground text-xs">{formatDate(payment.createdAt)}</td><td className="px-6 py-4">{payment.provider === "payoneer" && payment.status === "PENDING_ACTION" ? <PayoneerApproval paymentId={payment.id} /> : <span className="text-xs text-muted-foreground">—</span>}</td></tr>)}
              {payments.length === 0 && <tr><td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
