import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Film,
  Layers3,
  LockKeyhole,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";

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
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,.95fr)_minmax(30rem,1.05fr)] lg:gap-14">
          <div>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/[.06] px-3 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> {t("hero.badge")}
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.91] tracking-[-.055em] sm:text-7xl lg:text-[5.7rem]">
              Footage in.
              <br />
              <span className="text-white/38">A finished story out.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/48 sm:text-lg">
              Premium video editing with an operator-reviewed production
              pipeline—and a real spherical studio for directing 360° footage
              after the shoot.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[440px]:flex-row">
              <Link
                href="/order"
                className="gold-gradient flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-black"
              >
                Start a project <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/360-editor"
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-200/[.055] px-6 text-sm font-bold text-cyan-50"
              >
                <Layers3 className="h-4 w-4 text-cyan-200" /> Open 360 Studio
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-white/35">
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-300" /> Human
                approval gates
              </span>
              <span className="flex items-center gap-2">
                <LockKeyhole className="h-3.5 w-3.5 text-emerald-300" /> Private
                R2 delivery
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-emerald-300" /> Automatic
                expiry
              </span>
            </div>
          </div>

          <div className="relative min-h-[28rem] sm:min-h-[34rem]">
            <div className="absolute inset-x-[8%] top-[4%] h-[78%] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0d0f13] shadow-[0_35px_100px_rgba(0,0,0,.55)] sm:inset-x-[12%]">
              <div
                className="absolute inset-0 bg-cover"
                style={{
                backgroundImage: "url('/media/style-sprite-v1.webp')",
                  backgroundSize: "300% 200%",
                  backgroundPosition: "0% 0%",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/45">
                  Direction 01
                </p>
                <p className="mt-2 text-2xl font-black sm:text-3xl">
                  Cinematic narrative
                </p>
              </div>
            </div>
            <div className="absolute bottom-[2%] left-0 w-[45%] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0d0f13] shadow-2xl">
              <div
                className="aspect-[4/5] bg-cover"
                style={{
                backgroundImage: "url('/media/style-sprite-v1.webp')",
                  backgroundSize: "300% 200%",
                  backgroundPosition: "100% 100%",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute bottom-4 left-4 text-sm font-black">
                Creator social
              </span>
            </div>
            <Link
              href="/360-editor"
              className="group absolute bottom-0 right-0 flex w-[48%] flex-col overflow-hidden rounded-[1.25rem] border border-cyan-200/20 bg-[#071216] p-4 shadow-2xl sm:p-5"
            >
              <span className="absolute inset-0 bg-[repeating-radial-gradient(ellipse_at_80%_40%,transparent_0_13%,rgba(103,232,249,.11)_13.5%_14%,transparent_14.5%_24%)]" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
                <Layers3 className="h-4 w-4" />
              </span>
              <span className="relative mt-10 text-[10px] font-black uppercase tracking-[.16em] text-cyan-200/60">
                New workspace
              </span>
              <span className="relative mt-1 flex items-center justify-between gap-2 text-base font-black sm:text-lg">
                360 Reframe{" "}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[.06] bg-white/[.015] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/[.06] border-x border-white/[.06] sm:grid-cols-4 sm:divide-y-0">
          <Fact value="1 day" label="raw footage retention" />
          <Fact value="3 days" label="final render retention" />
          <Fact value="3" label="payment gateways" />
          <Fact value="360°" label="spherical reframe" />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-end gap-5 md:grid-cols-[minmax(0,1fr)_28rem]">
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
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DIRECTIONS.map((direction) => (
              <Link
                key={direction.label}
                href="/style-gallery"
                className="group relative min-h-72 overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-[#0d0f13]"
              >
                <div
                  className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{
                    backgroundImage: "url('/media/style-sprite-v1.webp')",
                    backgroundSize: "300% 200%",
                    backgroundPosition: direction.position,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 backdrop-blur">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
                <span className="absolute bottom-5 left-5 text-2xl font-black">
                  {direction.label}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/style-gallery"
            className="mt-5 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-white/60 hover:text-white"
          >
            Explore every direction <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-white/[.018] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200/60">
              A complete production path
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-5xl">
              From upload to verified delivery.
            </h2>
          </div>
          <div className="mt-9 grid gap-px overflow-hidden rounded-[1.5rem] border border-white/[.07] bg-white/[.07] md:grid-cols-4">
            <Step
              number="01"
              icon={Upload}
              title="Upload"
              copy="Verified multipart transfer to private object storage."
            />
            <Step
              number="02"
              icon={Film}
              title="Direct"
              copy="Choose the look—or animate a spherical camera path."
            />
            <Step
              number="03"
              icon={Sparkles}
              title="Render"
              copy="Queue-backed processing with progress and cost tracking."
            />
            <Step
              number="04"
              icon={LockKeyhole}
              title="Deliver"
              copy="Signed download links expire automatically after delivery."
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
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
              className="inline-flex min-h-12 items-center gap-2 text-sm font-bold text-white/55 hover:text-white"
            >
              Compare everything <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                key: "basic",
                price: 49,
                label: "Essential",
                accent: "border-white/[.08]",
              },
              {
                key: "plus",
                price: 149,
                label: "Studio",
                accent: "border-amber-300/25 bg-amber-300/[.035]",
              },
              {
                key: "premium",
                price: 399,
                label: "Studio Pro",
                accent: "border-violet-300/20 bg-violet-300/[.03]",
              },
            ].map((plan) => (
              <article
                key={plan.key}
                className={`rounded-[1.35rem] border p-5 sm:p-7 ${plan.accent}`}
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
                  className={`mt-6 flex min-h-13 items-center justify-center gap-2 rounded-xl text-sm font-bold ${plan.key === "plus" ? "gold-gradient text-black" : "border border-white/10 bg-white/[.025] text-white"}`}
                >
                  Choose {plan.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[1.75rem] border border-amber-300/15 bg-[radial-gradient(circle_at_88%_15%,rgba(245,184,52,.17),transparent_22rem),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-6 sm:p-10 lg:flex-row lg:items-end lg:p-12">
          <div>
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
          </div>
          <Link
            href="/order"
            className="gold-gradient flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-black sm:w-auto"
          >
            Create project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-[#090a0d] px-3 py-5 text-center sm:py-6">
      <div className="text-xl font-black sm:text-2xl">{value}</div>
      <div className="mt-1 text-[8px] font-bold uppercase tracking-[.14em] text-white/28 sm:text-[9px]">
        {label}
      </div>
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  copy,
}: {
  number: string;
  icon: typeof Upload;
  title: string;
  copy: string;
}) {
  return (
    <article className="bg-[#0a0c0f] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.06] text-cyan-100">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-xs text-white/20">{number}</span>
      </div>
      <h3 className="mt-8 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/38">{copy}</p>
    </article>
  );
}
