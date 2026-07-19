"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, Globe, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
];

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  function switchLocale(code: string) {
    const segments = pathname.split("/");
    const isLocaleSegment = LOCALES.some((l) => l.code === segments[1]);
    if (isLocaleSegment) segments[1] = code;
    else segments.splice(1, 0, code);
    router.push(segments.join("/") || "/");
    setLangOpen(false);
  }

  const navLinks = [
    { href: "/packages", label: t("packages") },
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/360-editor", label: "360 Studio" },
    { href: "/style-gallery", label: t("styleGallery") },
    { href: "/testimonials", label: t("testimonials") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <nav className="safe-top fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75" aria-label="Primary navigation">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg pr-2" aria-label="Azyume Cut AI home">
            <span className="truncate text-base font-black tracking-tight sm:text-xl">
              <span className="gold-text">Azyume</span>
              <span className="text-white"> Cut AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-4 min-[960px]:flex xl:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="touch-target flex items-center justify-center gap-1 rounded-lg px-2 text-sm text-muted-foreground transition-all hover:bg-white/5 hover:text-white sm:gap-1.5 sm:px-3"
                aria-expanded={langOpen}
                aria-label={`Change language, current language ${currentLocale.label}`}
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLocale.flag} {currentLocale.code.toUpperCase()}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", langOpen && "rotate-180")} />
              </button>
              {langOpen && (
                <div className="scrollbar-thin absolute right-0 mt-2 max-h-[min(28rem,60dvh)] w-[min(12rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-white/10 bg-card/95 shadow-2xl backdrop-blur-xl">
                  {LOCALES.map((loc) => (
                    <button
                      key={loc.code}
                      onClick={() => switchLocale(loc.code)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-white/5",
                        loc.code === locale ? "text-gold-400" : "text-muted-foreground"
                      )}
                    >
                      <span>{loc.flag}</span>
                      <span>{loc.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="hidden min-h-12 items-center rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-white md:inline-flex">
              {t("login")}
            </Link>
            <Link
              href="/order"
              className="hidden min-h-12 items-center rounded-lg px-4 text-sm font-bold text-black transition-opacity hover:opacity-90 min-[430px]:inline-flex gold-gradient"
            >
              {t("orderNow")}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="touch-target flex items-center justify-center rounded-lg hover:bg-white/5 min-[960px]:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-navigation" className="mobile-menu-height safe-bottom overflow-y-auto border-t border-white/5 bg-background/95 backdrop-blur-xl min-[960px]:hidden">
          <div className="space-y-1 px-3 py-3 sm:px-6">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 text-sm font-semibold text-white">
                {t("login")}
              </Link>
              <Link href="/order" onClick={() => setMobileOpen(false)} className="gold-gradient flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold text-black">
                {t("orderNow")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center rounded-xl px-4 text-sm text-muted-foreground transition-all hover:bg-white/5 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/portal"
              className="flex min-h-12 items-center rounded-xl px-4 text-sm text-muted-foreground transition-all hover:bg-white/5 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t("portal")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
