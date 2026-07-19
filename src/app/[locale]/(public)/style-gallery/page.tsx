import {
  ArrowRight,
  ArrowUpRight,
  Film,
  Layers3,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STYLES = [
  {
    slug: "cinematic",
    title: "Cinematic narrative",
    description:
      "Measured pacing, shaped contrast, atmospheric sound, and story-led cuts.",
    meta: ["Narrative", "2.39:1", "Film grain"],
    position: "0% 0%",
    featured: true,
  },
  {
    slug: "energetic",
    title: "Kinetic action",
    description:
      "Impact-driven cuts, motion accents, speed ramps, and high-energy timing.",
    meta: ["Action", "Beat sync", "Motion"],
    position: "50% 0%",
    featured: true,
  },
  {
    slug: "product",
    title: "Luxury product",
    description:
      "Tactile detail, controlled highlights, and clean benefit-first composition.",
    meta: ["Product", "Macro", "Premium"],
    position: "100% 0%",
  },
  {
    slug: "documentary",
    title: "Human documentary",
    description:
      "Natural performance, honest pacing, and unobtrusive editorial structure.",
    meta: ["Interview", "Natural", "Story"],
    position: "0% 100%",
  },
  {
    slug: "corporate",
    title: "Editorial corporate",
    description:
      "Architectural framing, credible typography, and confident information flow.",
    meta: ["Brand", "B2B", "Clean"],
    position: "50% 100%",
  },
  {
    slug: "social-media",
    title: "Creator social",
    description:
      "Immediate hooks, platform-native framing, and caption-safe composition.",
    meta: ["Vertical", "Hook", "Captions"],
    position: "100% 100%",
  },
];

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
        <div className="relative mx-auto max-w-7xl">
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
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/30">
                Selected work
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.03em] sm:text-3xl">
                Choose the visual language
              </h2>
            </div>
            <Link
              href="/360-editor"
              className="hidden min-h-12 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-white/65 transition-colors hover:border-cyan-300/25 hover:text-white sm:flex"
            >
              <Layers3 className="h-4 w-4 text-cyan-200" /> Open 360 Studio
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
            {STYLES.map((style) => (
              <Link
                key={style.slug}
                href={`/order?style=${style.slug}`}
                className={`group relative min-h-[21rem] overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-[#0d0f13] ${style.featured ? "xl:col-span-6" : "xl:col-span-4"}`}
              >
                <div
                  className="absolute inset-0 bg-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                  style={{
                    backgroundImage: "url('/media/style-sprite-v1.webp')",
                    backgroundSize: "300% 200%",
                    backgroundPosition: style.position,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                  <span className="flex h-11 w-11 translate-y-1 items-center justify-center rounded-full border border-white/15 bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {style.meta.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/65 backdrop-blur"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-black tracking-[-.035em] sm:text-3xl">
                    {style.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
                    {style.description}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href="/360-editor"
              className="group relative min-h-[21rem] overflow-hidden rounded-[1.35rem] border border-cyan-300/15 bg-[#071014] md:col-span-2 xl:col-span-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,.18),transparent_58%),repeating-radial-gradient(ellipse_at_center,transparent_0_12%,rgba(103,232,249,.09)_12.5%_13%,transparent_13.5%_22%),repeating-linear-gradient(90deg,transparent_0_9%,rgba(103,232,249,.08)_9.5%_10%,transparent_10.5%_20%)] transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent" />
              <div className="absolute right-[-6%] top-1/2 aspect-square w-[72%] -translate-y-1/2 rounded-full border border-cyan-200/20 shadow-[inset_0_0_80px_rgba(34,211,238,.09),0_0_80px_rgba(34,211,238,.08)]" />
              <div className="relative flex h-full min-h-[21rem] max-w-xl flex-col justify-end p-5 sm:p-7">
                <span className="mb-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-200/10 text-cyan-100 backdrop-blur">
                  <Layers3 className="h-5 w-5" />
                </span>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {["360°", "Virtual camera", "Keyframes"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-cyan-100/15 bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-cyan-50/70"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <h3 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">
                  Spherical reframe
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
                  Direct the viewer after the shoot. Animate yaw, pitch, roll,
                  and field of view, then deliver a normal flat video.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-100">
                  Enter the studio{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
          <Link
            href="/360-editor"
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 text-sm font-bold text-cyan-100 sm:hidden"
          >
            <Layers3 className="h-4 w-4" /> Open 360 Studio
          </Link>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-white/[.018] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
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
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[1.75rem] border border-amber-300/15 bg-[radial-gradient(circle_at_85%_20%,rgba(245,184,52,.16),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-6 sm:p-9 lg:flex-row lg:items-end lg:p-12">
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
        </div>
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
