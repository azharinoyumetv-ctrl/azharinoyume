import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-14 border-t border-white/5 bg-background/50 sm:mt-24">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-16 sm:pb-[max(4rem,env(safe-area-inset-bottom))] lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
          <div className="md:col-span-2">
            <div className="text-2xl font-black mb-3">
              <span className="gold-text">Azyume</span>
              <span className="text-white"> Cut AI</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">{t("tagline")}</p>
            <div className="flex flex-wrap items-center gap-2 mt-6 text-xs text-muted-foreground"><span className="px-2.5 py-1 rounded-full border border-white/10">DOKU</span><span className="px-2.5 py-1 rounded-full border border-white/10">Xendit v3</span><span className="px-2.5 py-1 rounded-full border border-white/10">Payoneer</span></div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t("support")}</div>
            <div className="space-y-3">
              <Link href="/faq" className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-white">FAQ</Link>
              <Link href="/how-it-works" className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-white">How It Works</Link>
              <Link href="/prompt-examples" className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-white">Prompt Examples</Link>
              <a href="mailto:support@azharinoyume.cloud" className="flex min-h-11 items-center break-all text-sm text-muted-foreground transition-colors hover:text-white">support@azharinoyume.cloud</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t("legal")}</div>
            <div className="space-y-3">
              <Link href="/privacy" className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-white">{t("privacyPolicy")}</Link>
              <Link href="/terms" className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-white">{t("terms")}</Link>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-6 sm:mt-12 sm:flex-row sm:items-center sm:gap-4 sm:pt-8">
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Azyume Cut AI. All rights reserved.</div>
          <div className="text-xs text-muted-foreground">azharinoyume.cloud</div>
        </div>
      </div>
    </footer>
  );
}
