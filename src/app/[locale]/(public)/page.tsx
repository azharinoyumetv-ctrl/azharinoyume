import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Play, Clock, Star, CheckCircle } from "lucide-react";

export default function HomePage() {
  const t = useTranslations();
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-background to-background" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-gold-500/20 text-gold-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
            {t("hero.badge")}
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="text-white">{t("hero.headline").split(".")[0]}.</span>
            <br />
            <span className="gold-text">{t("hero.headline").split(".")[1] || ""}</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("hero.subheadline")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/order"
              className="flex items-center gap-2 px-8 py-4 gold-gradient text-black font-bold rounded-xl hover:opacity-90 transition-opacity text-lg"
            >
              {t("hero.cta")} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/packages"
              className="flex items-center gap-2 px-8 py-4 glass border border-white/10 text-white font-semibold rounded-xl hover:border-white/20 transition-all text-lg"
            >
              <Play className="w-4 h-4 text-gold-400" />
              {t("hero.secondary")}
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { label: t("hero.stats.deliveryTime"), value: t("hero.stats.deliveryValue") },
              { label: t("hero.stats.satisfaction"), value: t("hero.stats.satisfactionValue") },
              { label: t("hero.stats.formats"), value: t("hero.stats.formatsValue") },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <div className="text-xl font-black gold-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">{t("packages.title")}</h2>
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
              className={`relative glass rounded-2xl p-8 border ${color} ${popular ? "glow-gold" : ""}`}
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
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">{t("nav.howItWorks")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <CheckCircle className="w-6 h-6 text-gold-400" />, title: "Pay first, always", desc: "Your footage is never processed until payment is confirmed. 100% guaranteed." },
            { icon: <Clock className="w-6 h-6 text-gold-400" />, title: "Fast turnaround", desc: "Most orders are delivered within 2–8 hours. Track your queue position live." },
            { icon: <Star className="w-6 h-6 text-gold-400" />, title: "Worldwide delivery", desc: "Accept payments in 50+ countries. Support in 8 languages." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-8 border border-white/5">
              <div className="mb-4">{icon}</div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto text-center px-4 py-24">
        <h2 className="text-4xl font-black mb-6">Ready to transform your footage?</h2>
        <p className="text-muted-foreground mb-8">Professional AI editing. Delivered fast. Worldwide.</p>
        <Link href="/order" className="inline-flex items-center gap-2 px-10 py-5 gold-gradient text-black font-bold rounded-xl hover:opacity-90 transition-opacity text-lg">
          {t("hero.cta")} <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
