import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-white/5 bg-background/50 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="text-2xl font-black mb-3">
              <span className="gold-text">azhari</span>
              <span className="text-white">noyume</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">{t("tagline")}</p>
            <div className="flex items-center gap-3 mt-6">
              <img src="/payment-xendit.svg" alt="Xendit" className="h-5 opacity-50 hover:opacity-100 transition-opacity" />
              <img src="/payment-payoneer.svg" alt="Payoneer" className="h-5 opacity-50 hover:opacity-100 transition-opacity" />
              <img src="/payment-wise.svg" alt="Wise" className="h-5 opacity-50 hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t("support")}</div>
            <div className="space-y-3">
              <Link href="/faq" className="block text-sm text-muted-foreground hover:text-white transition-colors">FAQ</Link>
              <Link href="/how-it-works" className="block text-sm text-muted-foreground hover:text-white transition-colors">How It Works</Link>
              <Link href="/prompt-examples" className="block text-sm text-muted-foreground hover:text-white transition-colors">Prompt Examples</Link>
              <a href="mailto:support@azharinoyume.cloud" className="block text-sm text-muted-foreground hover:text-white transition-colors">support@azharinoyume.cloud</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t("legal")}</div>
            <div className="space-y-3">
              <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-white transition-colors">{t("privacyPolicy")}</Link>
              <Link href="/terms" className="block text-sm text-muted-foreground hover:text-white transition-colors">{t("terms")}</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Azharinoyume. All rights reserved.</div>
          <div className="text-xs text-muted-foreground">azharinoyume.cloud</div>
        </div>
      </div>
    </footer>
  );
}
