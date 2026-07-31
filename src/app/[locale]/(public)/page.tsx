import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Layers3,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import {
  AnimatedFact,
  CheckBadge,
  DirectionGallery,
  HeroVisual,
  KineticTicker,
  MotionCta,
  ProductionFlow,
  Reveal,
} from "@/components/marketing/MotionExperience";

const DIRECTIONS = [
  { label: "Cinematic", position: "0% 0%" },
  { label: "Kinetic", position: "50% 0%" },
  { label: "Product", position: "100% 0%" },
];

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="overflow-hidden bg-[#07080a] text-white">
      <section className="relative border-b border-white/[.06] px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_4%,rgba(245,184,52,.13),transparent_30rem),radial-gradient(circle_at_84%_12%,rgba(34,211,238,.11),transparent_34rem)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,.95fr)_minmax(30rem,1.05fr)] lg:gap-14">
          <Reveal>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/[.06] px-3 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5 motion-safe:animate-pulse" />{" "}
              {t("hero.badge")}
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.91] tracking-[-.055em] sm:text-7xl lg:text-[5.7rem]">
              Footage in.
              <br />
              <span className="text-white/38">A finished story out.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/48 sm:text-lg">
              Upload your raw footage, define the outcome, and receive a
              tier-controlled finished production with draft review, automated
              QA, and optional human oversight.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[440px]:flex-row">
              <MotionCta
                href="/order"
                className="gold-gradient flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-black shadow-[0_16px_45px_rgba(212,160,23,.16)]"
              >
                Start a project <ArrowRight className="h-4 w-4" />
              </MotionCta>
              <MotionCta
                href="/360-editor"
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-200/[.055] px-6 text-sm font-bold text-cyan-50"
              >
                <Layers3 className="h-4 w-4 text-cyan-200" /> Open 360 Studio
              </MotionCta>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-semibold text-white/38">
              <CheckBadge>Human approval gates</CheckBadge>
              <CheckBadge>Private R2 delivery</CheckBadge>
              <CheckBadge>Automatic expiry</CheckBadge>
            </div>
          </Reveal>
          <HeroVisual />
        </div>
      </section>

      <KineticTicker />

      <section className="border-b border-white/[.06] bg-white/[.015] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/[.06] border-x border-white/[.06] sm:grid-cols-4 sm:divide-y-0">
          <AnimatedFact value="1 day" label="raw footage retention" />
          <AnimatedFact
            value="3 days"
            label="final render retention"
            delay={0.08}
          />
          <AnimatedFact value="3" label="payment gateways" delay={0.16} />
          <AnimatedFact value="360°" label="spherical reframe" delay={0.24} />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="grid items-end gap-5 md:grid-cols-[minmax(0,1fr)_28rem]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/30">
                Editing directions
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-5xl">
                A visual language for the footage.
              </h2>
            </div>
            <p className="text-sm leading-6 text-white/40">
              The style determines more than color. It shapes pace, sound,
              typography, motion, and where attention lands in every frame.
            </p>
          </Reveal>
          <DirectionGallery directions={DIRECTIONS} />
          <Reveal delay={0.12}>
            <Link
              href="/style-gallery"
              className="group mt-5 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-white/60 hover:text-white"
            >
              Explore every direction{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="relative border-y border-white/[.06] bg-white/[.018] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,211,238,.055),transparent_30rem)]" />
        <div className="relative mx-auto max-w-7xl">
          <Reveal className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200/60">
              A complete production path
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-5xl">
              From upload to verified delivery.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <ProductionFlow />
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/30">
                Packages
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-5xl">
                Choose the production depth.
              </h2>
            </div>
            <Link
              href="/packages"
              className="group inline-flex min-h-12 items-center gap-2 text-sm font-bold text-white/55 hover:text-white"
            >
              Compare everything{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                key: "basic",
                price: 14.99,
                label: "Automated short",
                accent: "border-white/[.08]",
              },
              {
                key: "plus",
                price: 44.99,
                label: "Creator production",
                accent:
                  "border-amber-300/25 bg-amber-300/[.035] shadow-[0_22px_70px_rgba(212,160,23,.08)]",
              },
              {
                key: "premium",
                price: 129.99,
                label: "Commercial production",
                accent: "border-violet-300/20 bg-violet-300/[.03]",
              },
            ].map((plan, index) => (
              <Reveal key={plan.key} delay={index * 0.08}>
                <article
                  className={`group rounded-[1.35rem] border p-5 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 sm:p-7 ${plan.accent}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">
                        {plan.label}
                      </p>
                      <h3 className="mt-2 text-xl font-black">
                        {t(`packages.${plan.key}.name`)}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black">${plan.price}</span>
                      <span className="block text-[10px] text-white/30">
                        from
                      </span>
                    </div>
                  </div>
                  <p className="mt-5 min-h-12 text-sm leading-6 text-white/42">
                    {t(`packages.${plan.key}.tagline`)}
                  </p>
                  <Link
                    href={`/order?package=${plan.key}`}
                    className={`mt-6 flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-transform active:scale-[.98] ${plan.key === "plus" ? "gold-gradient text-black" : "border border-white/10 bg-white/[.025] text-white group-hover:bg-white/[.05]"}`}
                  >
                    Choose {plan.label}{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="group relative flex flex-col items-start justify-between gap-7 overflow-hidden rounded-[1.75rem] border border-amber-300/15 bg-[radial-gradient(circle_at_88%_15%,rgba(245,184,52,.17),transparent_22rem),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-6 sm:p-10 lg:flex-row lg:items-end lg:p-12">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-amber-200/10 transition-transform duration-1000 group-hover:scale-125"
            />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">
                Ready when the footage is
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.045em] sm:text-5xl">
                Make the cut feel inevitable.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                Start a standard edit or open the 360 workspace and direct the
                camera yourself.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <span className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 text-amber-200" /> Fast queue
                </span>
                <span className="flex items-center gap-2">
                  <LockKeyhole className="h-3.5 w-3.5 text-amber-200" /> Private
                  by default
                </span>
              </div>
            </div>
            <MotionCta
              href="/order"
              className="gold-gradient relative flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-black sm:w-auto"
            >
              Create project <ArrowRight className="h-4 w-4" />
            </MotionCta>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
