import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STYLE_TAGS = [
  "cinematic", "anime", "minimal", "corporate", "energetic", "emotional",
  "documentary", "social-media", "product", "event", "music",
];

export default async function StyleGalleryPage() {
  // Only show testimonials where customer consented to show their video
  const testimonials = await prisma.testimonial.findMany({
    where: { status: "approved", published: true, consentShowVideo: true },
    orderBy: { createdAt: "desc" },
    take: 24,
    include: { user: { select: { name: true } } },
  });

  return (
    <main className="min-h-[calc(100svh-4rem-env(safe-area-inset-top))] bg-black px-4 py-10 text-white sm:py-14">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center sm:mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Style{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Gallery
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            Browse our editing styles and see what customers have said about their videos.
          </p>
        </div>

        {/* Style cards */}
        <div className="mb-14 sm:mb-20">
          <h2 className="text-xl font-bold mb-6">Editing Styles</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {STYLE_TAGS.map((style) => (
              <Link
                key={style}
                href={`/order?style=${style}`}
                className="glass group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-white/5 p-4 text-center transition-all duration-300 hover:border-amber-500/30 sm:p-6 md:hover:scale-105"
              >
                <div className="text-3xl mb-3">{styleEmoji(style)}</div>
                <div className="font-semibold capitalize group-hover:text-amber-400 transition-colors">
                  {style}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-6">What Clients Say</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {testimonials.map((t) => (
                <div key={t.id} className="glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                  {t.reviewText && (
                    <p className="text-white/80 text-sm leading-relaxed flex-1">&ldquo;{t.reviewText}&rdquo;</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {t.consentHideName ? (
                      <span className="font-medium">Verified Client</span>
                    ) : (
                      <span className="font-medium">{t.user?.name || "Client"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {testimonials.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            Testimonials coming soon as projects complete.
          </div>
        )}

        <div className="mt-12 text-center sm:mt-16">
          <Link
            href="/order"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-base font-black text-black transition-opacity hover:opacity-90 sm:w-auto sm:text-lg"
          >
            Start Your Project
          </Link>
        </div>
      </div>
    </main>
  );
}

function styleEmoji(style: string): string {
  const map: Record<string, string> = {
    cinematic: "🎬",
    anime: "⛩️",
    minimal: "◻️",
    corporate: "💼",
    energetic: "⚡",
    emotional: "💫",
    documentary: "📽️",
    "social-media": "📱",
    product: "🎯",
    event: "🎊",
    music: "🎵",
  };
  return map[style] || "🎞️";
}
