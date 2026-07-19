import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Play, Clock, Star, CheckCircle } from "lucide-react";

export default function HomePage() {
  const t = useTranslations();
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative flex min-h-[calc(100svh-4rem-env(safe-area-inset-top))] items-center justify-center px-4 py-10 sm:py-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-background to-background" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="glass mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-gold-500/20 px-3 py-2 text-xs font-medium text-gold-400 sm:mb-8 sm:px-4 sm:text-sm">
            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
            {t("hero.badge")}
          </div>

          <h1 className="mb-5 text-4xl font-black leading-[1.03] tracking-tight min-[380px]:text-5xl sm:mb-6 sm:text-7xl lg:text-8xl">
            <span className="text-white">{t("hero.headline").split(".")[0]}.</span>
            <br />
            <span className="gold-text">{t("hero.headline").split(".")[1] || ""}</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mb-12 sm:text-xl">
            {t("hero.subheadline")}
          </p>

          <div className="mx-auto mb-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mb-16 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/order"
              className="gold-gradient flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-bold text-black transition-opacity hover:opacity-90 sm:w-auto sm:px-8 sm:text-lg"
            >
              {t("hero.cta")} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/packages"
              className="glass flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-6 text-base font-semibold text-white transition-all hover:border-white/20 sm:w-auto sm:px-8 sm:text-lg"
            >
              <Play className="w-4 h-4 text-gold-400" />
              {t("hero.secondary")}
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 sm:gap-6">
            {[
              { label: t("hero.stats.deliveryTime"), value: t("hero.stats.deliveryValue") },
              { label: t("hero.stats.satisfaction"), value: t("hero.stats.satisfactionValue") },
              { label: t("hero.stats.formats"), value: t("hero.stats.formatsValue") },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl px-2 py-3 text-center sm:p-4">
                <div className="gold-text text-base font-black sm:text-xl">{stat.value}</div>
                <div className="mt-1 text-[10px] leading-tight text-muted-foreground sm:text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages preview */}
      <section className="section-spacing page-gutter mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">{t("packages.title")}</h2>
          <p className="text-muted-foreground">{t("packages.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: "basic", price: 49, popular: false, color: "border-white/10" },
            { key: "plus", price: 149, popular: true, color: "border-gold-500/40" },
            { key: "premium", price: 399, popular: false, color: "border-violet-500/30" },
          ].map(({ key, price, popular, color }) => (
            <div
              key={key}
              className={`relative glass rounded-2xl p-5 sm:p-8 border ${color} ${popular ? "glow-gold" : ""}`}
            >
              {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 gold-gradient text-black text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                {t(`packages.${key}.name`)}
              </div>
              <div className="text-4xl font-black mb-1">${price}</div>
              <div className="text-sm text-muted-foreground mb-6">{t(`packages.${key}.tagline`)}</div>
              <div className="text-sm font-medium mb-2">{t(`packages.${key}.duration`)}</div>
              <div className="text-xs text-muted-foreground mb-8">{t(`packages.${key}.bestFor`)}</div>
              <Link
                href={`/order?package=${key}`}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
                  popular
                    ? "gold-gradient text-black hover:opacity-90"
                    : "glass border border-white/10 hover:border-white/20 text-white"
                }`}
              >
                {t("packages.orderNow")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section-spacing page-gutter mx-auto max-w-7xl border-t border-white/5">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">{t("nav.howItWorks")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", title: "Choose Package", desc: "Select the right plan and fill out your editing preferences." },
            { step: "02", title: "Pay & Upload", desc: "Pay securely. Processing starts only after payment confirms." },
            { step: "03", title: "AI Edits", desc: "Our AI engine edits your footage based on your brief and style." },
            { step: "04", title: "Review & Download", desc: "Approve your draft. Request revisions. Download your final video." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 gold-gradient rounded-2xl flex items-center justify-center text-black font-black text-lg mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-bold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="section-spacing page-gutter mx-auto max-w-7xl border-t border-white/5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-8">
          {[
            { icon: <CheckCircle className="w-6 h-6 text-gold-400" />, title: "Pay first, always", desc: "Your footage is never processed until payment is confirmed. 100% guaranteed." },
            { icon: <Clock className="w-6 h-6 text-gold-400" />, title: "Fast turnaround", desc: "Most orders are delivered within 2–8 hours. Track your queue position live." },
            { icon: <Star className="w-6 h-6 text-gold-400" />, title: "Worldwide delivery", desc: "Accept payments in 50+ countries. Support in 8 languages." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl border border-white/5 p-5 sm:p-8">
              <div className="mb-4">{icon}</div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section-spacing mx-auto max-w-3xl px-4 text-center">
        <h2 className="mb-6 text-3xl font-black sm:text-4xl">Ready to transform your footage?</h2>
        <p className="text-muted-foreground mb-8">Professional AI editing. Delivered fast. Worldwide.</p>
        <Link href="/order" className="gold-gradient inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-8 text-base font-bold text-black transition-opacity hover:opacity-90 sm:w-auto sm:px-10 sm:text-lg">
          {t("hero.cta")} <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
