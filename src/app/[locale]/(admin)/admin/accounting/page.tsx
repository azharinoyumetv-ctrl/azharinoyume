import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getAccountingData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [monthRevenue, weekRevenue, profitReports, gatewayBreakdown, pendingPayments] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfMonth } }, _sum: { idrAmount: true } }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: startOfWeek } }, _sum: { idrAmount: true } }),
    prisma.profitReport.findMany({ orderBy: { calculatedAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true, package: true, customerEmail: true } } } }),
    prisma.payment.groupBy({ by: ["provider"], where: { status: "PAID" }, _sum: { idrAmount: true }, _count: true }),
    prisma.payment.count({ where: { status: { in: ["CREATED", "PENDING_ACTION"] } } }),
  ]);

  const avgMargin = profitReports.length > 0
    ? profitReports.reduce((s, r) => s + Number(r.profitMargin), 0) / profitReports.length
    : 0;

  return { monthRevenue: Number(monthRevenue._sum.idrAmount || 0), weekRevenue: Number(weekRevenue._sum.idrAmount || 0), profitReports, gatewayBreakdown, avgMargin, pendingPayments };
}

export default async function AccountingPage() {
  const data = await getAccountingData();

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Accounting</h1>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Month Revenue", value: formatCurrency(data.monthRevenue, "IDR") },
          { label: "Week Revenue", value: formatCurrency(data.weekRevenue, "IDR") },
          { label: "Avg Profit Margin", value: `${data.avgMargin.toFixed(1)}%` },
          { label: "Pending Payments", value: data.pendingPayments },
        ].map(({ label, value }) => (
          <div key={label} className="glass border border-white/5 rounded-2xl p-6">
            <div className="text-2xl font-black mb-1">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Gateway breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass border border-white/5 rounded-2xl p-6">
          <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Revenue by Gateway</h2>
          <div className="space-y-3">
            {data.gatewayBreakdown.map((g) => (
              <div key={g.provider} className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{g.provider}</span>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(Number(g._sum.idrAmount || 0), "IDR")}</div>
                  <div className="text-xs text-muted-foreground">{g._count} transactions</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass border border-white/5 rounded-2xl p-6">
          <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">80% Profit Rule</h2>
          <div className="space-y-3 text-sm">
            <div className="text-muted-foreground">Target: ≥80% gross profit margin</div>
            <div className="text-muted-foreground">Cost cap: ≤20% of order price</div>
            <div className="text-muted-foreground">Warning threshold: 15% cost used</div>
            <div className="text-muted-foreground">Alert threshold: 20% cost used</div>
            <div className={`font-bold text-lg mt-2 ${data.avgMargin >= 80 ? "text-green-400" : data.avgMargin >= 70 ? "text-gold-400" : "text-red-400"}`}>
              Current avg: {data.avgMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Profit per order */}
      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-bold">Profit per Order</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Package</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Profit</th>
                <th className="px-6 py-4 text-right">Margin</th>
                <th className="px-6 py-4 text-right">Cap Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.profitReports.map((r) => (
                <tr key={r.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{r.order.orderNumber}</td>
                  <td className="px-6 py-4">{r.order.package.toUpperCase()}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(Number(r.grossRevenue))}</td>
                  <td className="px-6 py-4 text-right text-red-400">{formatCurrency(Number(r.totalDirectCost))}</td>
                  <td className="px-6 py-4 text-right text-green-400 font-bold">{formatCurrency(Number(r.grossProfit))}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${Number(r.profitMargin) >= 80 ? "text-green-400" : Number(r.profitMargin) >= 70 ? "text-gold-400" : "text-red-400"}`}>
                      {Number(r.profitMargin).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-xs ${Number(r.costCapUsedPct) >= 20 ? "text-red-400 font-bold" : Number(r.costCapUsedPct) >= 15 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {Number(r.costCapUsedPct).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
