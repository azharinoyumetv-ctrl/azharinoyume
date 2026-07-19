import { prisma } from "@/lib/prisma";

export const revalidate = 60;

async function getTestimonials() {
  return prisma.testimonial.findMany({
    where: { status: "approved", published: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
    },
  });
}

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10 text-center sm:mb-16">
        <h1 className="mb-4 text-4xl font-black sm:text-5xl">Customer Reviews</h1>
        <p className="text-muted-foreground">Every testimonial is real, approved by the customer, and published with their explicit consent.</p>
      </div>

      {testimonials.length === 0 ? (
        <div className="py-14 text-center text-muted-foreground sm:py-24">
          <p>Reviews from our first customers will appear here soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {testimonials.map((t) => (
            <div key={t.id} className="glass flex flex-col gap-4 rounded-2xl border border-white/5 p-5 sm:p-6">
              {t.consentShowVideo && t.showcaseR2Key && (
                <div className="aspect-video bg-black/50 rounded-xl overflow-hidden">
                  <video controls playsInline className="h-full w-full" preload="none">
                    <source src={`/api/showcase/${t.id}/video`} />
                  </video>
                </div>
              )}
              <div>
                <div className="flex text-gold-400 mb-3">{"★★★★★"}</div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">&ldquo;{t.reviewText}&rdquo;</p>
              </div>
              <div className="mt-auto pt-4 border-t border-white/5 text-xs text-muted-foreground">
                {t.consentHideName ? "Anonymous customer" : (t.user?.name || "Customer")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
