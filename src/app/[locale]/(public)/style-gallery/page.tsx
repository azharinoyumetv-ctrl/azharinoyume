import { ArrowRight, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InteractiveStyleGrid from "@/components/marketing/InteractiveStyleGrid";
import { Reveal } from "@/components/marketing/MotionExperience";
import { STYLE_DIRECTIONS } from "@/lib/production/catalog";

export default async function StyleGalleryPage() {
  const testimonials = await prisma.testimonial.findMany({
    where: { status: "approved", published: true, consentShowVideo: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { user: { select: { name: true } } },
  });

  return (
    <main className="min-h-[calc(100svh-4rem)] overflow-hidden bg-[#07080a] text-white">
      <section className="relative border-b border-white/[.06] px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.10),transparent_34rem),radial-gradient(circle_at_88%_18%,rgba(245,184,52,.09),transparent_30rem)]" />
        <Reveal className="relative mx-auto max-w-7xl">
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[.06] px-3 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" /> Editing direction
              </span>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[.94] tracking-[-.05em] sm:text-6xl lg:text-7xl">
                A look is not a filter.
                <br />
                <span className="text-white/38">
                  It is a system of decisions.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/45 sm:text-lg">
                Choose a visual direction, then shape the pacing, camera, sound,
                captions, and delivery format around your footage.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.07]">
              <Metric value="6" label="directions" />
              <Metric value="4K" label="delivery" />
              <Metric value="360°" label="reframe" />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <InteractiveStyleGrid styles={STYLE_DIRECTIONS.map((style) => ({ ...style, meta: [...style.meta] }))} />
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-white/[.018] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[.07] text-amber-200">
                <Film className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-.04em]">
                Proof over promises.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/40">
                Only approved work with explicit client consent appears here.
              </p>
            </div>
            {testimonials.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {testimonials.map((testimonial) => (
                  <article
                    key={testimonial.id}
                    className="rounded-2xl border border-white/[.07] bg-black/20 p-5"
                  >
                    <p className="text-sm leading-6 text-white/70">
                      “{testimonial.reviewText}”
                    </p>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[.15em] text-white/30">
                      {testimonial.consentHideName
                        ? "Verified client"
                        : testimonial.user?.name || "Client"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-44 items-center rounded-2xl border border-dashed border-white/10 bg-black/15 p-6">
                <div>
                  <p className="text-sm font-bold text-white/65">
                    Client showcase is being curated.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/35">
                    Projects appear only after delivery, approval, and explicit
                    showcase consent.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[1.75rem] border border-amber-300/15 bg-[radial-gradient(circle_at_85%_20%,rgba(245,184,52,.16),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-6 sm:p-9 lg:flex-row lg:items-end lg:p-12">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">
              Start with direction
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-5xl">
              Bring the footage. Shape the point of view.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
              Standard footage or full spherical capture—the project starts with
              the way you want the audience to feel.
            </p>
          </div>
          <Link
            href="/order"
            className="gold-gradient flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-black sm:w-auto"
          >
            Create project <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-[#0c0e12] p-3 text-center sm:p-4">
      <div className="text-lg font-black text-white sm:text-xl">{value}</div>
      <div className="mt-1 text-[8px] font-bold uppercase tracking-[.14em] text-white/25 sm:text-[9px]">
        {label}
      </div>
    </div>
  );
}
