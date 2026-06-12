import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const PACKAGES = [
  {
    key: "basic",
    name: "Basic",
    price: 49,
    tagline: "Perfect for short-form content",
    duration: "Up to 60 seconds",
    rawFootage: "Up to 10 minutes raw footage",
    revisions: 1,
    resolution: "1080p",
    captions: "Basic captions",
    exports: "1 export format",
    bestFor: ["TikTok", "Instagram Reels", "YouTube Shorts", "Simple ads"],
    features: ["Basic captions", "1 export format", "1080p included", "Basic color grade", "Background music"],
    color: "border-white/10",
    cta: "ghost",
  },
  {
    key: "plus",
    name: "Plus",
    price: 149,
    tagline: "Ideal for YouTube and business videos",
    duration: "Up to 4 minutes",
    rawFootage: "Up to 30 minutes raw footage",
    revisions: 2,
    resolution: "1080p",
    captions: "Styled captions",
    exports: "2 export formats",
    bestFor: ["YouTube", "Business promos", "Podcast highlights", "Lessons"],
    features: ["Styled captions", "2 export formats", "1080p included", "Pro color grade", "B-roll suggestions", "Background music"],
    color: "border-gold-500/40",
    popular: true,
    cta: "gold",
  },
  {
    key: "premium",
    name: "Premium",
    price: 399,
    tagline: "Full professional production",
    duration: "Up to 10 minutes",
    rawFootage: "Up to 90 minutes raw footage",
    revisions: 3,
    resolution: "4K",
    captions: "Premium subtitles",
    exports: "3 export formats",
    bestFor: ["YouTube long-form", "Course content", "Brand videos", "Podcast repurposing"],
    features: ["Premium subtitles", "3 export formats", "4K included", "AI B-roll plan", "Thumbnail concept", "Human review", "Motion graphics"],
    color: "border-violet-500/30",
    cta: "ghost",
  },
];

const ADDONS = [
  { name: "Extra 30s final video", price: 20 },
  { name: "Extra 60s final video", price: 35 },
  { name: "Extra revision", price: 15 },
  { name: "Rush processing", price: "+50%" },
  { name: "Multi-language subtitles", price: "$20/lang" },
  { name: "Extra export format", price: 10 },
  { name: "Extra aspect ratio version", price: 15 },
  { name: "4K export (Basic/Plus)", price: 25 },
  { name: "60fps export (Basic/Plus)", price: 15 },
  { name: "Thumbnail design", price: 25 },
  { name: "Script rewrite", price: "30+" },
  { name: "Advanced motion graphics", price: "50+" },
  { name: "AI voiceover", price: "25+" },
  { name: "Extra raw footage (per 10 min)", price: 10 },
];

export default function PackagesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">Packages</h1>
        <p className="text-muted-foreground text-lg">One-time payment. No subscriptions. No hidden fees.</p>
      </div>

      {/* Package cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.key}
            className={`relative glass rounded-2xl p-8 border ${pkg.color} ${pkg.popular ? "glow-gold" : ""} flex flex-col`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 gold-gradient text-black text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{pkg.name}</div>
              <div className="text-5xl font-black mb-2">${pkg.price}</div>
              <div className="text-sm text-muted-foreground mb-6">{pkg.tagline}</div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gold-400">▶</span>
                  <span className="font-medium">{pkg.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>📁</span> {pkg.rawFootage}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>🔄</span> {pkg.revisions} revision{pkg.revisions > 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>🎬</span> Up to {pkg.resolution}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 mb-6 space-y-2.5">
                {pkg.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="mb-8">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Best for</div>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.bestFor.map((b) => (
                    <span key={b} className="px-2.5 py-1 rounded-full bg-white/5 text-xs">{b}</span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={`/order?package=${pkg.key}`}
              className={`mt-auto flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                pkg.cta === "gold"
                  ? "gold-gradient text-black hover:opacity-90"
                  : "glass border border-white/10 hover:border-white/20 text-white"
              }`}
            >
              Order {pkg.name} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Add-ons */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">Add-Ons</h2>
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          {ADDONS.map((addon, i) => (
            <div
              key={addon.name}
              className={`flex items-center justify-between px-6 py-4 ${i !== ADDONS.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <span className="text-sm">{addon.name}</span>
              <span className="text-sm font-bold text-gold-400">
                {typeof addon.price === "number" ? `$${addon.price}` : addon.price}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Add-ons are selected during checkout. Rush processing adds 50% of your package price.
        </p>
      </div>
    </div>
  );
}
