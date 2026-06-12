"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Upload, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Form constants ───────────────────────────────────────────────
const PURPOSES = ["Wedding","Graduation","Birthday","Business promo","Product advertisement","YouTube video","TikTok / Instagram Reels / YouTube Shorts","Podcast clip","Real estate","Restaurant / food promo","Travel vlog","Education / course video","Gaming highlight","Family memory","Memorial / tribute","Other / custom"];
const VISUAL_STYLES = ["Cinematic","Clean corporate","Luxury","Minimalist","Documentary","Fast viral short-form","Emotional","Funny","Elegant","Vintage","Anime-inspired","Product commercial","Real estate luxury","Social media creator style"];
const MOODS = ["Romantic","Professional","Energetic","Calm","Emotional","Inspirational","Premium","Happy","Nostalgic","Dramatic","Soft","Powerful"];
const EDITING_PACES = ["Slow and emotional","Balanced","Fast cuts","Viral short-form","Smooth cinematic"];
const COLOR_GRADES = ["Natural","Warm","Cool","Moody","Bright","Luxury gold","Soft pastel","High contrast"];
const CAPTION_STYLES = ["No captions","Minimal subtitles","Bold viral captions","Elegant subtitles","Corporate lower-thirds","Karaoke-style captions"];
const MUSIC_STYLES = ["No music","Romantic piano","Corporate uplifting","Cinematic","Lo-fi","Energetic beat","Wedding soft music","Graduation inspiring music","Dramatic trailer music"];
const PLATFORMS = ["YouTube","TikTok","Instagram Reels","YouTube Shorts","Instagram Feed","Facebook","LinkedIn","Website","Presentation","Custom"];
const ASPECT_RATIOS = ["16:9 horizontal","9:16 vertical","1:1 square","4:5 portrait","Custom"];
const RESOLUTIONS = ["720p","1080p","1440p","4K / 2160p"];
const FRAME_RATES = ["24fps cinematic","30fps standard","60fps smooth motion"];
const EXPORT_FORMATS = ["MP4 default","MOV optional","Custom if requested"];
const COMPRESSIONS = ["Smaller file size","Balanced quality","Highest quality"];
const PAYMENT_METHODS = ["xendit", "payoneer", "wise"];

const PACKAGES = { basic: { price: 49, name: "Basic" }, plus: { price: 149, name: "Plus" }, premium: { price: 399, name: "Premium" } };

const ADDONS = [
  { key: "extra_30s", label: "Extra 30s final video", price: 20 },
  { key: "extra_60s", label: "Extra 60s final video", price: 35 },
  { key: "extra_revision", label: "Extra revision", price: 15 },
  { key: "rush", label: "Rush processing (+50%)", price: 0 },
  { key: "multi_lang_subs", label: "Multi-language subtitles", price: 20 },
  { key: "extra_format", label: "Extra export format", price: 10 },
  { key: "extra_ratio", label: "Extra aspect ratio version", price: 15 },
  { key: "4k_upgrade", label: "4K export (Basic/Plus only)", price: 25 },
  { key: "60fps", label: "60fps export (Basic/Plus)", price: 15 },
  { key: "thumbnail", label: "Thumbnail design", price: 25 },
  { key: "voiceover", label: "AI voiceover", price: 25 },
];

type Package = "basic" | "plus" | "premium";
type Step = "package" | "style" | "technical" | "upload" | "prompt" | "payment";

const STEPS: Step[] = ["package", "style", "technical", "upload", "prompt", "payment"];

interface FormData {
  package: Package;
  purpose: string;
  visualStyle: string;
  mood: string;
  editingPace: string;
  colorGrade: string;
  captionStyle: string;
  musicStyle: string;
  platform: string;
  aspectRatio: string;
  resolution: string;
  frameRate: string;
  exportFormat: string;
  compression: string;
  cloudLink: string;
  customerNotes: string;
  generatedPrompt: string;
  addOns: string[];
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-xs">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "px-3 py-2.5 rounded-lg text-sm text-left transition-all border",
              value === opt
                ? "border-gold-500 bg-gold-500/10 text-gold-400"
                : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OrderForm() {
  const t = useTranslations("order");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPkg = (searchParams.get("package") as Package) || "plus";

  const [step, setStep] = useState<Step>("package");
  const [form, setForm] = useState<FormData>({
    package: initialPkg,
    purpose: "",
    visualStyle: "",
    mood: "",
    editingPace: "Balanced",
    colorGrade: "Natural",
    captionStyle: "No captions",
    musicStyle: "No music",
    platform: "YouTube",
    aspectRatio: "16:9 horizontal",
    resolution: "1080p",
    frameRate: "30fps standard",
    exportFormat: "MP4 default",
    compression: "Balanced quality",
    cloudLink: "",
    customerNotes: "",
    generatedPrompt: "",
    addOns: [],
    paymentMethod: "payoneer",
    customerName: "",
    customerEmail: "",
    customerCompany: "",
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAddon = (key: string) => {
    setForm((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(key) ? prev.addOns.filter((a) => a !== key) : [...prev.addOns, key],
    }));
  };

  const calculateTotal = () => {
    const base = PACKAGES[form.package].price;
    const addonTotal = form.addOns.reduce((sum, key) => {
      if (key === "rush") return sum + base * 0.5;
      return sum + (ADDONS.find((a) => a.key === key)?.price || 0);
    }, 0);
    return base + addonTotal;
  };

  async function generatePrompt() {
    setGeneratingPrompt(true);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: form.purpose, visualStyle: form.visualStyle, mood: form.mood,
          editingPace: form.editingPace, colorGrade: form.colorGrade,
          captionStyle: form.captionStyle, musicStyle: form.musicStyle,
          platform: form.platform, aspectRatio: form.aspectRatio,
          resolution: form.resolution, customerNotes: form.customerNotes,
        }),
      });
      const data = await res.json();
      set("generatedPrompt", data.prompt || "");
    } catch {
      setError("Failed to generate prompt. Please write your own.");
    } finally {
      setGeneratingPrompt(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify({ ...form, total: calculateTotal() }));
      if (uploadedFile) formData.append("file", uploadedFile);

      const res = await fetch("/api/orders", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      router.push(`/order/${data.orderId}?checkout=${data.checkoutUrl ? "1" : "0"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black mb-2">{t("title")}</h1>
      <p className="text-muted-foreground mb-10">{t("subtitle")}</p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < currentStepIndex && setStep(s)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                s === step ? "gold-gradient text-black" : i < currentStepIndex ? "bg-white/10 text-white cursor-pointer" : "bg-white/5 text-muted-foreground cursor-default"
              )}
            >
              {t(`steps.${s}`)}
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step: Package */}
      {step === "package" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(PACKAGES) as [Package, { price: number; name: string }][]).map(([key, pkg]) => (
              <button
                key={key}
                type="button"
                onClick={() => set("package", key)}
                className={cn(
                  "p-6 rounded-2xl border text-left transition-all",
                  form.package === key ? "border-gold-500 bg-gold-500/10 glow-gold" : "border-white/10 glass hover:border-white/20"
                )}
              >
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{pkg.name}</div>
                <div className="text-3xl font-black mb-1">${pkg.price}</div>
                {form.package === key && <div className="text-xs text-gold-400 font-semibold mt-2">✓ Selected</div>}
              </button>
            ))}
          </div>
          <button onClick={() => setStep("style")} className="w-full py-4 gold-gradient text-black font-bold rounded-xl">
            Continue →
          </button>
        </div>
      )}

      {/* Step: Style */}
      {step === "style" && (
        <div className="space-y-8">
          <SelectField label={t("purpose")} value={form.purpose} onChange={(v) => set("purpose", v)} options={PURPOSES} />
          <SelectField label={t("visualStyle")} value={form.visualStyle} onChange={(v) => set("visualStyle", v)} options={VISUAL_STYLES} />
          <SelectField label={t("mood")} value={form.mood} onChange={(v) => set("mood", v)} options={MOODS} />
          <SelectField label={t("editingPace")} value={form.editingPace} onChange={(v) => set("editingPace", v)} options={EDITING_PACES} />
          <SelectField label={t("colorGrade")} value={form.colorGrade} onChange={(v) => set("colorGrade", v)} options={COLOR_GRADES} />
          <SelectField label={t("captionStyle")} value={form.captionStyle} onChange={(v) => set("captionStyle", v)} options={CAPTION_STYLES} />
          <SelectField label={t("musicStyle")} value={form.musicStyle} onChange={(v) => set("musicStyle", v)} options={MUSIC_STYLES} />
          <div className="flex gap-3">
            <button onClick={() => setStep("package")} className="flex-1 py-3 glass border border-white/10 rounded-xl text-sm">← Back</button>
            <button onClick={() => setStep("technical")} className="flex-1 py-3 gold-gradient text-black font-bold rounded-xl">Continue →</button>
          </div>
        </div>
      )}

      {/* Step: Technical */}
      {step === "technical" && (
        <div className="space-y-8">
          <SelectField label={t("platform")} value={form.platform} onChange={(v) => set("platform", v)} options={PLATFORMS} />
          <SelectField label={t("aspectRatio")} value={form.aspectRatio} onChange={(v) => set("aspectRatio", v)} options={ASPECT_RATIOS} />
          <SelectField label={t("resolution")} value={form.resolution} onChange={(v) => set("resolution", v)} options={RESOLUTIONS} />
          <SelectField label={t("frameRate")} value={form.frameRate} onChange={(v) => set("frameRate", v)} options={FRAME_RATES} />
          <SelectField label={t("exportFormat")} value={form.exportFormat} onChange={(v) => set("exportFormat", v)} options={EXPORT_FORMATS} />
          <SelectField label={t("compression")} value={form.compression} onChange={(v) => set("compression", v)} options={COMPRESSIONS} />
          <div className="flex gap-3">
            <button onClick={() => setStep("style")} className="flex-1 py-3 glass border border-white/10 rounded-xl text-sm">← Back</button>
            <button onClick={() => setStep("upload")} className="flex-1 py-3 gold-gradient text-black font-bold rounded-xl">Continue →</button>
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-xs">{t("uploadFile")}</label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-gold-500/40 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{uploadedFile ? uploadedFile.name : "Click to upload or drag & drop"}</span>
              <span className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI up to 10GB</span>
              <input type="file" className="hidden" accept="video/*" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-xs">
              <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
              {t("orCloudLink")}
            </label>
            <input
              type="url"
              value={form.cloudLink}
              onChange={(e) => set("cloudLink", e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-sm focus:border-gold-500/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("technical")} className="flex-1 py-3 glass border border-white/10 rounded-xl text-sm">← Back</button>
            <button onClick={() => { setStep("prompt"); generatePrompt(); }} className="flex-1 py-3 gold-gradient text-black font-bold rounded-xl">
              Generate Prompt →
            </button>
          </div>
        </div>
      )}

      {/* Step: Prompt */}
      {step === "prompt" && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("generatedPrompt")}</label>
              <button
                onClick={generatePrompt}
                disabled={generatingPrompt}
                className="flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", generatingPrompt && "animate-spin")} />
                {t("regenerate")}
              </button>
            </div>
            <textarea
              value={generatingPrompt ? "Generating your prompt..." : form.generatedPrompt}
              onChange={(e) => set("generatedPrompt", e.target.value)}
              rows={6}
              className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-sm focus:border-gold-500/50 focus:outline-none resize-none"
              placeholder="Your AI editing prompt will appear here..."
            />
            <p className="text-xs text-muted-foreground mt-2">{t("editPrompt")}</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">{t("customerNotes")}</label>
            <textarea
              value={form.customerNotes}
              onChange={(e) => set("customerNotes", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-sm focus:border-gold-500/50 focus:outline-none resize-none"
              placeholder="Any specific instructions, reference videos, or details..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wider">{t("addOns")}</label>
            <div className="space-y-2">
              {ADDONS.map((addon) => (
                <label key={addon.key} className="flex items-center justify-between p-3 glass border border-white/5 rounded-xl cursor-pointer hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.addOns.includes(addon.key)}
                      onChange={() => toggleAddon(addon.key)}
                      className="rounded"
                    />
                    <span className="text-sm">{addon.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gold-400">
                    {addon.key === "rush" ? "+50%" : `+$${addon.price}`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("upload")} className="flex-1 py-3 glass border border-white/10 rounded-xl text-sm">← Back</button>
            <button onClick={() => setStep("payment")} className="flex-1 py-3 gold-gradient text-black font-bold rounded-xl">Continue →</button>
          </div>
        </div>
      )}

      {/* Step: Payment */}
      {step === "payment" && (
        <div className="space-y-6">
          {/* Invoice details */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t("invoiceDetails")}</h3>
            {[
              { key: "customerName", label: "Full Name", type: "text" },
              { key: "customerEmail", label: "Email", type: "email" },
              { key: "customerCompany", label: "Company (optional)", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof FormData] as string}
                  onChange={(e) => set(key as keyof FormData, e.target.value)}
                  className="w-full px-4 py-3 glass border border-white/10 rounded-xl text-sm focus:border-gold-500/50 focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wider">{t("paymentMethod")}</label>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => set("paymentMethod", method)}
                  className={cn(
                    "p-4 rounded-xl border text-center transition-all",
                    form.paymentMethod === method ? "border-gold-500 bg-gold-500/10" : "border-white/10 glass hover:border-white/20"
                  )}
                >
                  <div className="text-sm font-semibold capitalize">{method}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {method === "xendit" ? "SEA / Indonesia" : method === "payoneer" ? "Global" : "Bank transfer"}
                  </div>
                </button>
              ))}
            </div>
            {form.paymentMethod === "wise" && (
              <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                ⚠️ Wise bank transfer requires manual verification (1–4 hours). Include your Order ID as payment reference.
              </div>
            )}
          </div>

          {/* Order total */}
          <div className="glass border border-white/10 rounded-xl p-6">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">{PACKAGES[form.package].name} package</span>
              <span>${PACKAGES[form.package].price}</span>
            </div>
            {form.addOns.map((key) => {
              const addon = ADDONS.find((a) => a.key === key);
              if (!addon) return null;
              const price = key === "rush" ? PACKAGES[form.package].price * 0.5 : addon.price;
              return (
                <div key={key} className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{addon.label}</span>
                  <span>+${price}</span>
                </div>
              );
            })}
            <div className="border-t border-white/5 pt-3 flex justify-between font-bold text-lg">
              <span>{t("total")}</span>
              <span className="gold-text">${calculateTotal()}</span>
            </div>
          </div>

          {error && <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setStep("prompt")} className="flex-1 py-3 glass border border-white/10 rounded-xl text-sm">← Back</button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.customerEmail || !form.customerName}
              className="flex-1 py-4 gold-gradient text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("placeOrder")} — ${calculateTotal()}
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your video will not be processed until payment is confirmed. You will receive an invoice PDF by email.
          </p>
        </div>
      )}
    </div>
  );
}
