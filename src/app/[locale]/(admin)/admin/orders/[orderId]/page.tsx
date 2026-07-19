import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import AdminOrderActions from "@/components/admin/AdminOrderActions";

export default async function AdminOrderDetailPage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const params = await props.params;
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      invoices: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      uploadedAssets: true,
      editBriefs: { orderBy: { createdAt: "desc" }, take: 1 },
      renders: { orderBy: { id: "desc" }, take: 3 },
      revisions: { orderBy: { revisionNumber: "asc" } },
      deliveryLinks: { orderBy: { createdAt: "desc" }, take: 1 },
      costLogs: true,
      aiUsageLogs: true,
      profitReport: true,
    },
  });

  if (!order) notFound();

  const totalCost = order.costLogs.reduce((s, l) => s + Number(l.amount), 0);
  const invoice = order.invoices[0];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/orders"
          className="text-muted-foreground hover:text-white text-sm"
        >
          ← Orders
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-black">{order.orderNumber}</h1>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            order.status === "delivered"
              ? "bg-green-500/10 text-green-400"
              : order.manualReviewRequired && !order.adminApproved
                ? "bg-amber-500/10 text-amber-400"
                : "bg-white/5 text-muted-foreground"
          }`}
        >
          {order.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <div className="glass border border-white/5 rounded-2xl p-6">
            <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{order.customerName || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{order.customerEmail}</span>
              </div>
              {order.customerCompany && (
                <div>
                  <span className="text-muted-foreground">Company:</span>{" "}
                  <span className="font-medium">{order.customerCompany}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Language:</span>{" "}
                <span className="font-medium">
                  {order.customerPromptLanguage || "en"}
                </span>
              </div>
            </div>
          </div>

          {/* Original prompt */}
          {order.customerPromptOriginal && (
            <div className="glass border border-white/5 rounded-2xl p-6">
              <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                Customer Prompt (Original)
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.customerPromptOriginal}
              </p>
              {order.customerPromptEn &&
                order.customerPromptEn !== order.customerPromptOriginal && (
                  <>
                    <div className="border-t border-white/5 my-4" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      English Translation
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">
                      {order.customerPromptEn}
                    </p>
                  </>
                )}
            </div>
          )}

          {/* Edit brief */}
          {order.editBriefs[0] && (
            <div className="glass border border-gold-500/20 rounded-2xl p-6">
              <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                Generated Edit Brief
              </h2>
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed">
                {JSON.stringify(order.editBriefs[0].structuredBrief, null, 2) ||
                  order.editBriefs[0].promptEn}
              </pre>
            </div>
          )}

          {/* Order details */}
          <div className="glass border border-white/5 rounded-2xl p-6">
            <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Order Settings
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Package", value: order.package.toUpperCase() },
                {
                  label: "Editing mode",
                  value:
                    order.editingMode === "360"
                      ? "360° spherical reframe"
                      : "Standard edit",
                },
                { label: "Purpose", value: order.purpose },
                { label: "Style", value: order.visualStyle },
                { label: "Mood", value: order.mood },
                { label: "Pace", value: order.editingPace },
                { label: "Color", value: order.colorGrade },
                { label: "Captions", value: order.captionStyle },
                { label: "Music", value: order.musicStyle },
                { label: "Platform", value: order.platform },
                { label: "Ratio", value: order.aspectRatio },
                { label: "Resolution", value: order.resolution },
                { label: "Frame rate", value: order.frameRate },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <span className="text-muted-foreground">{label}: </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {order.editingMode === "360" && order.editorConfig && (
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.045] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200/65">
                    360 production data
                  </p>
                  <h2 className="mt-2 text-lg font-bold">
                    Virtual camera path
                  </h2>
                </div>
                <Link
                  href="/360-editor"
                  className="rounded-xl border border-cyan-200/15 bg-black/20 px-3 py-2 text-xs font-bold text-cyan-100"
                >
                  Open studio
                </Link>
              </div>
              <pre className="mt-5 max-h-72 overflow-auto rounded-xl border border-white/[.07] bg-black/30 p-4 text-xs leading-5 text-white/55">
                {JSON.stringify(order.editorConfig, null, 2)}
              </pre>
            </div>
          )}

          {/* Files */}
          {order.uploadedAssets.length > 0 && (
            <div className="glass border border-white/5 rounded-2xl p-6">
              <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                Uploaded Files
              </h2>
              <div className="space-y-2">
                {order.uploadedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between text-sm p-3 glass rounded-xl"
                  >
                    <span className="font-mono text-xs">
                      {asset.r2Key || asset.cloudUrl}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {asset.assetType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revisions */}
          {order.revisions.length > 0 && (
            <div className="glass border border-white/5 rounded-2xl p-6">
              <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                Revisions ({order.revisionCount}/{order.maxRevisions})
              </h2>
              <div className="space-y-3">
                {order.revisions.map((rev) => (
                  <div key={rev.id} className="p-3 glass rounded-xl text-sm">
                    <div className="font-medium mb-1">
                      Revision #{rev.revisionNumber} — {rev.status}
                    </div>
                    <div className="text-muted-foreground">
                      {rev.customerNotes}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Admin actions */}
          <AdminOrderActions order={JSON.parse(JSON.stringify(order))} />

          {/* Invoice */}
          {invoice && (
            <div className="glass border border-white/5 rounded-2xl p-6">
              <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                Invoice
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number</span>
                  <span>{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={
                      invoice.status === "paid"
                        ? "text-green-400"
                        : "text-amber-400"
                    }
                  >
                    {invoice.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">
                    {formatCurrency(Number(invoice.total))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span>{invoice.paymentMethod}</span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span>{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
                {invoice.paymentReference && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-muted-foreground flex-shrink-0">
                      Reference
                    </span>
                    <span className="font-mono text-xs text-right">
                      {invoice.paymentReference}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cost tracking */}
          <div className="glass border border-white/5 rounded-2xl p-6">
            <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Cost Tracking
            </h2>
            {order.profitReport ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span>
                    {formatCurrency(Number(order.profitReport.grossRevenue))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway fee</span>
                  <span className="text-red-400">
                    -{formatCurrency(Number(order.profitReport.gatewayFee))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI cost</span>
                  <span className="text-red-400">
                    -{formatCurrency(Number(order.profitReport.aiCost))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Render cost</span>
                  <span className="text-red-400">
                    -{formatCurrency(Number(order.profitReport.renderCost))}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between font-bold">
                  <span>Gross Profit</span>
                  <span className="text-green-400">
                    {formatCurrency(Number(order.profitReport.grossProfit))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Profit margin</span>
                  <span
                    className={`font-bold ${Number(order.profitReport.profitMargin) >= 80 ? "text-green-400" : "text-amber-400"}`}
                  >
                    {Number(order.profitReport.profitMargin).toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`flex justify-between text-xs ${Number(order.profitReport.costCapUsedPct) >= 20 ? "text-red-400" : Number(order.profitReport.costCapUsedPct) >= 15 ? "text-amber-400" : "text-muted-foreground"}`}
                >
                  <span>Cost cap used</span>
                  <span className="font-bold">
                    {Number(order.profitReport.costCapUsedPct).toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Running total: {formatCurrency(totalCost)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
