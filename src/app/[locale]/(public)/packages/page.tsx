import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { PROJECT_TIERS } from "@/lib/production/catalog";

const CAPABILITIES = {
  basic: [
    "Automatic scene selection and cleanup",
    "Captions, music matching, and basic color treatment",
    "One 1080p output and one automated revision",
    "Automated technical QA",
  ],
  plus: [
    "Advanced footage and narrative analysis",
    "Animated captions, stock B-roll direction, and smart audio",
    "One master plus two social-format variants",
    "Two revisions and automated creative QA",
  ],
  premium: [
    "Advanced multimodal planning and brand-kit application",
    "4K master plus two additional format variants",
    "Limited generated B-roll and priority rendering",
    "Two draft cycles plus human QA",
  ],
} as const;

export default function PackagesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-gold-400">
          Project pricing
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-6xl">
          Pay for a finished production.
        </h1>
        <p className="mt-5 text-base leading-7 text-white/45 sm:text-lg">
          Every price includes a source-footage allowance, promised output,
          planning depth, draft, QA, and revisions. Expensive processing starts
          only after payment.
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        {Object.values(PROJECT_TIERS).map((tier) => (
          <article
            key={tier.key}
            className={`rounded-[1.5rem] border p-5 sm:p-7 ${
              tier.key === "plus"
                ? "border-gold-400/30 bg-gold-400/[.05] shadow-[0_25px_80px_rgba(212,160,23,.08)]"
                : "border-white/8 bg-white/[.02]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">
                  {tier.label}
                </p>
                <h2 className="mt-2 text-2xl font-black">{tier.name}</h2>
              </div>
              {tier.key === "plus" && (
                <span className="rounded-full bg-gold-400 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-black">
                  Recommended
                </span>
              )}
            </div>
            <div className="mt-6 text-4xl font-black">
              ${tier.priceUsd}
              <span className="text-sm font-medium text-white/30">
                {" "}
                / project
              </span>
            </div>
            <p className="mt-4 min-h-14 text-sm leading-6 text-white/45">
              {tier.description}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <Stat label="Raw footage" value={`${tier.sourceMinutes} min`} />
              <Stat
                label="Final video"
                value={
                  tier.finalSeconds < 120
                    ? `${tier.finalSeconds} sec`
                    : `${tier.finalSeconds / 60} min`
                }
              />
              <Stat label="Outputs" value={`${tier.outputVariants}`} />
              <Stat label="Resolution" value={tier.resolution} />
            </div>

            <ul className="mt-6 space-y-3">
              {CAPABILITIES[tier.key].map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-2 text-sm leading-5 text-white/55"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {capability}
                </li>
              ))}
            </ul>

            <Link
              href={`/order?package=${tier.key}`}
              className={`mt-7 flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black ${
                tier.key === "plus"
                  ? "gold-gradient text-black"
                  : "border border-white/10 bg-white/[.025]"
              }`}
            >
              Build my brief <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/[.04] p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black">No unused-credit trap</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/45">
              Launch pricing is one project, one invoice, one confirmed scope.
              Source overages, extra output duration, 4K outside Premium,
              generated media, human intervention, rush work, and new scope are
              quoted before they are consumed.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/7 bg-black/15 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-white/25">
        {label}
      </div>
      <div className="mt-1 font-black text-white/80">{value}</div>
    </div>
  );
}
