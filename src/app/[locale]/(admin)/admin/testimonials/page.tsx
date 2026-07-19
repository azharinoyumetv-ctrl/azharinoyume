import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import TestimonialActions from "@/components/admin/TestimonialActions";

export default async function AdminTestimonialsPage(
  props: {
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab || "pending";
  const statusMap: Record<string, string> = { pending: "pending", approved: "approved", rejected: "rejected" };
  const status = statusMap[tab] || "pending";

  const testimonials = await prisma.testimonial.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });

  const counts = await prisma.testimonial.groupBy({ by: ["status"], _count: true });
  const cMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Testimonials</h1>

      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected"].map((t) => (
          <a
            key={t}
            href={`?tab=${t}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white/10 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/8"
            }`}
          >
            {t} {cMap[t] !== undefined && <span className="ml-1 text-xs opacity-70">({cMap[t]})</span>}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {testimonials.map((t) => (
          <div key={t.id} className="glass border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-bold">{t.user?.name || t.user?.email || "Anonymous"}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Order: {t.orderId.slice(0, 8)} · {formatDate(t.createdAt)}
                </div>
                {t.showcaseR2Key && (
                  <div className="mt-1 text-xs text-blue-400">Has showcase video</div>
                )}
              </div>
              {t.status === "pending" && <TestimonialActions id={t.id} />}
              {t.status === "approved" && (
                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                  {t.published ? "Published" : "Approved (not published)"}
                </span>
              )}
              {t.status === "rejected" && (
                <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">Rejected</span>
              )}
            </div>

            {t.reviewText && (
              <p className="text-sm text-white/80 leading-relaxed">&ldquo;{t.reviewText}&rdquo;</p>
            )}

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {t.consentShowVideo && <span className="bg-white/5 px-2 py-0.5 rounded">✓ Can show video</span>}
              {t.consentShowPrompt && <span className="bg-white/5 px-2 py-0.5 rounded">✓ Can show prompt</span>}
              {t.consentHideName && <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">Hide name</span>}
              {t.consentHideBrand && <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">Hide brand</span>}
              {!t.consentShowVideo && !t.consentShowPrompt && (
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded">⚠ No publish consent given</span>
              )}
            </div>
          </div>
        ))}
        {testimonials.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No {status} testimonials.</div>
        )}
      </div>
    </div>
  );
}
