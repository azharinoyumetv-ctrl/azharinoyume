import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import EnableNotifications from "@/components/EnableNotifications";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  DRAFT_UPLOAD: "bg-white/5 text-muted-foreground",
  QUEUED: "bg-amber-500/10 text-amber-400",
  RENDERING: "bg-blue-500/10 text-blue-400",
  DRAFT_REVIEW: "bg-purple-500/10 text-purple-400",
  REVISION_REQUESTED: "bg-cyan-500/10 text-cyan-400",
  DELIVERED: "bg-green-500/20 text-green-300",
  RENDER_FAILED: "bg-red-500/10 text-red-300",
};

export default async function PortalPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      invoices: { take: 1, orderBy: { createdAt: "desc" } },
      deliveryLinks: { where: { expiresAt: { gt: new Date() } }, take: 1 },
      renders: { orderBy: { id: "desc" }, take: 1 },
    },
  });

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black">Your Orders</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {session.user.email}</p>
        </div>
        <div className="flex gap-3 mb-8 flex-wrap"><Link href="/portal/billing" className="px-4 py-2 gold-gradient text-black font-bold rounded-xl text-sm">Wallet & billing</Link><EnableNotifications /></div>

        {orders.length === 0 && (
          <div className="glass border border-white/5 rounded-2xl p-16 text-center">
            <p className="text-muted-foreground mb-6">No orders yet.</p>
            <Link href="/order" className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:opacity-90 transition-opacity">
              Place Your First Order
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => {
            const invoice = order.invoices[0];
            const delivery = order.deliveryLinks[0];
            const render = order.renders[0];

            return (
              <div key={order.id} className="glass border border-white/5 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Link href={`/order/${order.id}`} className="font-bold text-lg hover:text-amber-400 transition-colors">
                      {order.orderNumber}
                    </Link>
                    <div className="text-sm text-muted-foreground mt-0.5 capitalize">
                      {order.package} · {order.visualStyle}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-white/5 text-muted-foreground"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold">{formatCurrency(Number(order.totalPrice), order.currency)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
                  {render && order.status === "RENDERING" && (
                    <span className="text-xs text-amber-400 animate-pulse">Rendering…</span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <Link
                    href={`/order/${order.id}`}
                    className="px-4 py-2 glass border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium transition-all"
                  >
                    Track Order
                  </Link>

                  {invoice && invoice.status.toUpperCase() === "PAID" && (
                    <a
                      href={`/api/invoice/${invoice.id}/pdf`}
                      target="_blank"
                      className="px-4 py-2 glass border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium transition-all"
                    >
                      Download Invoice
                    </a>
                  )}

                  {delivery?.r2Key && ["DRAFT_REVIEW", "DELIVERED"].includes(order.status) && (
                    <a
                      href={`/api/v1/orders/${order.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                    >
                      Download Video
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
