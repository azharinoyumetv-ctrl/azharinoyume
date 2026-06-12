"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, ChevronDown, Globe } from "lucide-react";
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
    { href: "/style-gallery", label: t("styleGallery") },
    { href: "/testimonials", label: t("testimonials") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">
              <span className="gold-text">Azyume</span>
              <span className="text-white"> Cut AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLocale.flag} {currentLocale.code.toUpperCase()}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", langOpen && "rotate-180")} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl glass border border-white/10 shadow-2xl overflow-hidden">
                  {LOCALES.map((loc) => (
                    <button
                      key={loc.code}
                      onClick={() => switchLocale(loc.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-left",
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

            <Link href="/login" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-white transition-colors">
              {t("login")}
            </Link>
            <Link
              href="/order"
              className="px-4 py-2 rounded-lg gold-gradient text-black text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {t("orderNow")}
            </Link>

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/5">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/5 bg-background/95 backdrop-blur">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/portal"
              className="block px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
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
