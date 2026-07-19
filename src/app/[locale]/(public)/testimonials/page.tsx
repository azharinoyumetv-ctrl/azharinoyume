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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">Customer Reviews</h1>
        <p className="text-muted-foreground">Every testimonial is real, approved by the customer, and published with their explicit consent.</p>
      </div>

      {testimonials.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p>Reviews from our first customers will appear here soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.id} className="glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
              {t.consentShowVideo && t.showcaseR2Key && (
                <div className="aspect-video bg-black/50 rounded-xl overflow-hidden">
                  <video controls className="w-full h-full" preload="none">
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
