"use client";

import { useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSHA256 } from "hash-wasm";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  CAPTION_STYLES,
  COLOR_GRADES,
  MOODS,
  MUSIC_STYLES,
  PACES,
  PLATFORM_PRESETS,
  PROJECT_TIERS,
  PURPOSES,
  STYLE_DIRECTIONS,
  type ProjectTier,
} from "@/lib/production/catalog";
import {
  evaluateProductionBrief,
  type ProductionBriefInput,
} from "@/lib/production/brief";
import { cn } from "@/lib/utils";

const STEPS = ["Direction", "Creative brief", "Delivery", "Confirm"] as const;

type FormState = Omit<ProductionBriefInput, "briefConfirmed"> & {
  briefConfirmed: boolean;
};

async function hashFile(file: File, onProgress: (value: number) => void) {
  const hasher = await createSHA256();
  const chunk = 8 * 1024 * 1024;
  for (let offset = 0; offset < file.size; offset += chunk) {
    hasher.update(
      new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer()),
    );
    onProgress(
      Math.round((Math.min(file.size, offset + chunk) / file.size) * 15),
    );
  }
  return hasher.digest();
}

function validTier(value: string | null): ProjectTier {
  return value && value in PROJECT_TIERS ? (value as ProjectTier) : "plus";
}

function validStyle(value: string | null) {
  return STYLE_DIRECTIONS.some((style) => style.slug === value)
    ? value!
    : "cinematic";
}

function initialState(searchParams: ReturnType<typeof useSearchParams>): FormState {
  const tier = validTier(searchParams.get("package"));
  const visualStyle = validStyle(searchParams.get("style"));
  const style = STYLE_DIRECTIONS.find(
    (candidate) => candidate.slug === visualStyle,
  )!;
  return {
    tier,
    purpose: "",
    audience: "",
    visualStyle,
    mood: style.defaultMood,
    editingPace: style.defaultPace,
    colorGrade: style.defaultColorGrade,
    captionStyle: "minimal",
    musicStyle: "cinematic",
    platform: "youtube",
    aspectRatio: "16:9",
    resolution: "1080p",
    frameRate: "30fps",
    exportFormat: "MP4",
    compression: "balanced",
    targetDurationSeconds: Math.min(60, PROJECT_TIERS[tier].finalSeconds),
    storyPriority: "",
    mandatoryContent: "",
    excludedContent: "",
    creativeFreedom: "balanced",
    prompt: "",
    briefConfirmed: false,
  };
}

export default function OrderForm() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => initialState(searchParams));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    orderId: string;
    priceUsd: number;
  } | null>(null);

  const tier = PROJECT_TIERS[form.tier];
  const assessment = useMemo(
    () =>
      evaluateProductionBrief({
        ...form,
        briefConfirmed: true,
      }),
    [form],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value, briefConfirmed: false }));
  }

  function chooseTier(nextTier: ProjectTier) {
    const next = PROJECT_TIERS[nextTier];
    setForm((current) => ({
      ...current,
      tier: nextTier,
      targetDurationSeconds: Math.min(
        current.targetDurationSeconds,
        next.finalSeconds,
      ),
      resolution:
        current.resolution === "4K" && nextTier !== "premium"
          ? "1080p"
          : current.resolution,
      briefConfirmed: false,
    }));
  }

  function chooseStyle(slug: string) {
    const style = STYLE_DIRECTIONS.find((candidate) => candidate.slug === slug);
    if (!style) return;
    setForm((current) => ({
      ...current,
      visualStyle: style.slug,
      mood: style.defaultMood,
      editingPace: style.defaultPace,
      colorGrade: style.defaultColorGrade,
      briefConfirmed: false,
    }));
  }

  function choosePlatform(platform: string) {
    const preset =
      PLATFORM_PRESETS[platform as keyof typeof PLATFORM_PRESETS] ||
      PLATFORM_PRESETS.custom;
    setForm((current) => ({
      ...current,
      platform,
      aspectRatio: preset.aspectRatio,
      resolution: preset.resolution,
      frameRate: preset.frameRate,
      briefConfirmed: false,
    }));
  }

  function canContinue() {
    if (step === 0)
      return form.purpose.trim().length >= 2 && Boolean(form.visualStyle);
    if (step === 1)
      return (
        form.audience.trim().length >= 2 &&
        form.storyPriority.trim().length >= 2 &&
        form.prompt.trim().length >= 10
      );
    if (step === 2) return assessment.readyForProduction;
    return Boolean(file && form.briefConfirmed);
  }

  async function submit() {
    if (!file) {
      setError("Choose the raw footage before continuing.");
      return;
    }
    if (!form.briefConfirmed || !assessment.readyForProduction) {
      setError("Resolve the brief conflicts and confirm the production brief.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const orderResponse = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `order-${crypto.randomUUID()}`,
        },
        body: JSON.stringify(form),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok)
        throw new Error(order.error || "Could not create project");

      const checksumSha256 = await hashFile(file, setProgress);
      const uploadResponse = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          fileName: file.name,
          sizeBytes: file.size,
          mimeType: file.type || "video/mp4",
          checksumSha256,
        }),
      });
      const upload = await uploadResponse.json();
      if (!uploadResponse.ok)
        throw new Error(upload.error || "Could not start upload");

      const parts: { partNumber: number; etag: string }[] = [];
      for (
        let partNumber = 1;
        partNumber <= upload.expectedParts;
        partNumber++
      ) {
        const signResponse = await fetch(
          `/api/v1/uploads/${upload.assetId}/parts/${partNumber}`,
          { method: "POST" },
        );
        const signed = await signResponse.json();
        if (!signResponse.ok)
          throw new Error(signed.error || "Could not sign upload part");
        const start = (partNumber - 1) * upload.partSizeBytes;
        const response = await fetch(signed.url, {
          method: "PUT",
          body: file.slice(
            start,
            Math.min(file.size, start + upload.partSizeBytes),
          ),
        });
        if (!response.ok) throw new Error(`Upload part ${partNumber} failed`);
        const etag = response.headers.get("etag");
        if (!etag)
          throw new Error("R2 CORS must expose the ETag response header");
        parts.push({ partNumber, etag });
        setProgress(
          15 + Math.round((partNumber / upload.expectedParts) * 75),
        );
      }

      const completeResponse = await fetch(
        `/api/v1/uploads/${upload.assetId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parts }),
        },
      );
      const completed = await completeResponse.json();
      if (!completeResponse.ok)
        throw new Error(completed.error || "Video verification failed");

      if (
        completed.durationMs &&
        completed.durationMs > tier.sourceMinutes * 60_000
      ) {
        throw new Error(
          `${tier.name} includes up to ${tier.sourceMinutes} source minutes. Choose a higher tier or shorten the footage.`,
        );
      }

      const quoteResponse = await fetch(`/api/v1/orders/${order.id}/quote`, {
        method: "POST",
        headers: {
          "Idempotency-Key": `project-quote-${crypto.randomUUID()}`,
        },
      });
      const quote = await quoteResponse.json();
      if (!quoteResponse.ok)
        throw new Error(quote.error || "Could not prepare project checkout");

      setProgress(100);
      setResult({ orderId: order.id, priceUsd: tier.priceUsd });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Project submission failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 text-center sm:py-24">
        <h1 className="text-3xl font-black sm:text-4xl">
          Sign in to create a production
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your brief, raw footage, invoice, drafts, and delivery stay attached to
          one private project.
        </p>
        <button
          onClick={() =>
            signIn("email", { callbackUrl: window.location.href })
          }
          className="gold-gradient mt-8 min-h-14 w-full rounded-xl px-7 font-bold text-black sm:w-auto"
        >
          Email me a sign-in link
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 text-center sm:py-24">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <FileCheck2 />
        </span>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">
          Brief and footage verified
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your ${result.priceUsd.toFixed(2)} project invoice is ready.
          Production remains locked until payment is confirmed.
        </p>
        <Link
          href={`/order/${result.orderId}`}
          className="gold-gradient mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-xl px-7 font-bold text-black sm:w-auto"
        >
          Review invoice and pay
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0">
          <div className="mb-7">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-gold-400">
              Guided production request
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">
              Choose the result. Azyume builds the edit.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
              Define the outcome before compute begins. The confirmed brief
              becomes the production contract for planning, QA, and revisions.
            </p>
          </div>

          <ol className="mb-6 grid grid-cols-4 gap-1 sm:gap-2">
            {STEPS.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => index < step && setStep(index)}
                  className={cn(
                    "w-full rounded-xl border px-2 py-3 text-left text-[9px] font-bold uppercase tracking-[.1em] sm:px-3 sm:text-[10px]",
                    index === step
                      ? "border-gold-400/30 bg-gold-400/10 text-gold-300"
                      : index < step
                        ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300"
                        : "border-white/7 text-white/25",
                  )}
                >
                  <span className="block text-base">{index + 1}</span>
                  <span className="hidden sm:block">{label}</span>
                </button>
              </li>
            ))}
          </ol>

          <section className="dashboard-panel p-4 sm:p-7">
            {step === 0 && (
              <div className="space-y-7">
                <SectionTitle
                  title="Select the production depth"
                  description="The tier controls analysis depth, output limits, revisions, and QA—not only export quality."
                />
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.values(PROJECT_TIERS).map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => chooseTier(item.key)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-colors",
                        form.tier === item.key
                          ? "border-gold-400/35 bg-gold-400/10"
                          : "border-white/8 bg-white/[.02] hover:border-white/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black">{item.name}</div>
                          <div className="mt-1 text-xs text-white/35">
                            {item.label}
                          </div>
                        </div>
                        <div className="font-black text-gold-300">
                          ${item.priceUsd}
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-white/45">
                        {item.description}
                      </p>
                      <div className="mt-4 text-[10px] uppercase tracking-wider text-white/30">
                        {item.sourceMinutes} source min · {item.finalSeconds}s
                        final
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <FieldLabel>What is the video for?</FieldLabel>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PURPOSES.map((purpose) => (
                      <ChoiceButton
                        key={purpose}
                        selected={form.purpose === purpose}
                        onClick={() => update("purpose", purpose)}
                      >
                        {purpose}
                      </ChoiceButton>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Choose a visual direction</FieldLabel>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {STYLE_DIRECTIONS.map((style) => (
                      <button
                        type="button"
                        key={style.slug}
                        onClick={() => chooseStyle(style.slug)}
                        className={cn(
                          "rounded-2xl border p-4 text-left",
                          form.visualStyle === style.slug
                            ? "border-cyan-300/35 bg-cyan-300/[.08]"
                            : "border-white/8 bg-white/[.02]",
                        )}
                      >
                        <div className="font-bold">{style.title}</div>
                        <p className="mt-2 text-xs leading-5 text-white/40">
                          {style.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <SectionTitle
                  title="Clarify the creative direction"
                  description="These answers let the planner distinguish a correction from a later scope change."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Who is the audience?"
                    value={form.audience}
                    onChange={(value) => update("audience", value)}
                    placeholder="Customers, family, YouTube subscribers..."
                  />
                  <TextField
                    label="What should the story prioritize?"
                    value={form.storyPriority}
                    onChange={(value) => update("storyPriority", value)}
                    placeholder="The emotional journey, product benefit, lesson..."
                  />
                  <SelectField
                    label="Mood"
                    value={form.mood}
                    options={MOODS}
                    onChange={(value) => update("mood", value)}
                  />
                  <SelectField
                    label="Editing pace"
                    value={form.editingPace}
                    options={PACES}
                    onChange={(value) => update("editingPace", value)}
                  />
                  <SelectField
                    label="Color treatment"
                    value={form.colorGrade}
                    options={COLOR_GRADES}
                    onChange={(value) => update("colorGrade", value)}
                  />
                  <SelectField
                    label="Captions"
                    value={form.captionStyle}
                    options={CAPTION_STYLES}
                    onChange={(value) => update("captionStyle", value)}
                  />
                  <SelectField
                    label="Music direction"
                    value={form.musicStyle}
                    options={MUSIC_STYLES}
                    onChange={(value) => update("musicStyle", value)}
                  />
                  <SelectField
                    label="Creative freedom"
                    value={form.creativeFreedom}
                    options={[
                      ["low", "Low — follow my instructions closely"],
                      ["balanced", "Balanced — decide within my rules"],
                      ["high", "High — choose the strongest story"],
                    ]}
                    onChange={(value) =>
                      update(
                        "creativeFreedom",
                        value as FormState["creativeFreedom"],
                      )
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextAreaField
                    label="Must include"
                    value={form.mandatoryContent}
                    onChange={(value) => update("mandatoryContent", value)}
                    placeholder="Required people, dialogue, scenes, products, logos, or CTA. Write “No specific moments” if unrestricted."
                  />
                  <TextAreaField
                    label="Must exclude"
                    value={form.excludedContent}
                    onChange={(value) => update("excludedContent", value)}
                    placeholder="Damaged product, private people, sensitive dialogue, shaky footage. Write “Nothing specific” if none."
                  />
                </div>
                <TextAreaField
                  label="Describe the result in your own words"
                  value={form.prompt}
                  onChange={(value) => update("prompt", value)}
                  rows={5}
                  placeholder="Example: Open with the strongest emotional moment, build a warm cinematic story, keep family reactions, remove repeated or shaky shots, and finish with the couple leaving together."
                />
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "prompt",
                      `Create a ${form.mood} ${form.purpose.toLowerCase()} for ${form.audience}. Use the ${STYLE_DIRECTIONS.find((style) => style.slug === form.visualStyle)?.title.toLowerCase()} direction with ${form.editingPace.replaceAll("-", " ")} pacing and a ${form.colorGrade.replaceAll("-", " ")} color treatment. Prioritize ${form.storyPriority || "the strongest story in the footage"}. Include ${form.mandatoryContent || "the most meaningful moments"} and exclude ${form.excludedContent || "unusable, repeated, or distracting footage"}.`,
                    )
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-4 text-sm font-bold text-violet-200"
                >
                  <Sparkles className="h-4 w-4" /> Build a prompt from my
                  selections
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <SectionTitle
                  title="Set the promised deliverable"
                  description="Platform presets choose safe defaults; advanced settings remain editable."
                />
                <div>
                  <FieldLabel>Where will this be published?</FieldLabel>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
                      <ChoiceButton
                        key={key}
                        selected={form.platform === key}
                        onClick={() => choosePlatform(key)}
                      >
                        {preset.label}
                      </ChoiceButton>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField
                    label="Aspect ratio"
                    value={form.aspectRatio}
                    options={[
                      ["16:9", "16:9 horizontal"],
                      ["9:16", "9:16 vertical"],
                      ["1:1", "1:1 square"],
                      ["4:5", "4:5 portrait"],
                      ["custom", "Custom"],
                    ]}
                    onChange={(value) =>
                      update("aspectRatio", value as FormState["aspectRatio"])
                    }
                  />
                  <SelectField
                    label="Resolution"
                    value={form.resolution}
                    options={[
                      ["720p", "720p"],
                      ["1080p", "1080p"],
                      ["1440p", "1440p"],
                      ["4K", "4K / 2160p"],
                    ]}
                    onChange={(value) =>
                      update("resolution", value as FormState["resolution"])
                    }
                  />
                  <SelectField
                    label="Frame rate"
                    value={form.frameRate}
                    options={[
                      ["24fps", "24fps cinematic"],
                      ["30fps", "30fps standard"],
                      ["60fps", "60fps smooth"],
                    ]}
                    onChange={(value) =>
                      update("frameRate", value as FormState["frameRate"])
                    }
                  />
                  <SelectField
                    label="Export format"
                    value={form.exportFormat}
                    options={[
                      ["MP4", "MP4"],
                      ["MOV", "MOV"],
                    ]}
                    onChange={(value) =>
                      update(
                        "exportFormat",
                        value as FormState["exportFormat"],
                      )
                    }
                  />
                  <SelectField
                    label="Compression"
                    value={form.compression}
                    options={[
                      ["smaller", "Smaller file"],
                      ["balanced", "Balanced"],
                      ["highest", "Highest quality"],
                    ]}
                    onChange={(value) =>
                      update(
                        "compression",
                        value as FormState["compression"],
                      )
                    }
                  />
                  <label className="text-sm">
                    <FieldLabel>Target finished duration</FieldLabel>
                    <div className="mt-2 flex min-h-12 items-center rounded-xl border border-white/10 bg-black/20 px-3">
                      <input
                        type="number"
                        min={1}
                        max={tier.finalSeconds}
                        value={form.targetDurationSeconds}
                        onChange={(event) =>
                          update(
                            "targetDurationSeconds",
                            Number(event.target.value),
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent outline-none"
                      />
                      <span className="text-xs text-white/35">seconds</span>
                    </div>
                  </label>
                </div>

                {assessment.issues.length > 0 && (
                  <div className="space-y-2">
                    {assessment.issues.map((issue) => (
                      <div
                        key={issue.code}
                        className={cn(
                          "rounded-xl border p-3 text-sm",
                          issue.severity === "error"
                            ? "border-rose-400/20 bg-rose-400/[.07] text-rose-200"
                            : "border-amber-400/20 bg-amber-400/[.07] text-amber-100",
                        )}
                      >
                        <div className="flex gap-2 font-bold">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          {issue.message}
                        </div>
                        <p className="mt-1 pl-6 text-xs opacity-65">
                          {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <SectionTitle
                  title="Confirm the production contract"
                  description="Azyume guarantees conformity to this approved brief—not an unstated or subjective expectation."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Summary
                    label="Commercial"
                    value={`${tier.name} · $${tier.priceUsd.toFixed(2)} · ${tier.revisions} revision${tier.revisions === 1 ? "" : "s"}`}
                  />
                  <Summary
                    label="Creative direction"
                    value={`${form.purpose} · ${form.mood} · ${form.editingPace.replaceAll("-", " ")}`}
                  />
                  <Summary
                    label="Audience and story"
                    value={`${form.audience} · ${form.storyPriority}`}
                  />
                  <Summary
                    label="Delivery"
                    value={`${PLATFORM_PRESETS[form.platform as keyof typeof PLATFORM_PRESETS].label} · ${form.aspectRatio} · ${form.resolution} · ${form.frameRate}`}
                  />
                  <Summary
                    label="Must include"
                    value={form.mandatoryContent || "Not specified"}
                  />
                  <Summary
                    label="Must exclude"
                    value={form.excludedContent || "Not specified"}
                  />
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.15em] text-white/30">
                    Customer direction
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                    {form.prompt}
                  </p>
                </div>

                <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 px-4 text-center transition-colors hover:border-gold-500/40">
                  <Upload className="mb-2" />
                  <span className="max-w-full break-words">
                    {file?.name || "Choose the raw video files"}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Maximum 10 GB · {tier.sourceMinutes} source minutes included
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] || null)
                    }
                  />
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] p-4">
                  <input
                    type="checkbox"
                    checked={form.briefConfirmed}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        briefConfirmed: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-emerald-400"
                  />
                  <span className="text-sm leading-6 text-white/65">
                    I confirm the brief, limits, required content, exclusions,
                    and deliverable above. New requirements after payment may
                    require a revised quote.
                  </span>
                </label>
              </div>
            )}

            {busy && (
              <div className="mt-6">
                <div className="h-2 rounded bg-white/10">
                  <div
                    className="gold-gradient h-2 rounded"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hashing, uploading, and verifying… {progress}%
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                {error}
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={step === 0 || busy}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={!canContinue()}
                  onClick={() => setStep((current) => current + 1)}
                  className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-black disabled:opacity-35"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canContinue() || busy || status === "loading"}
                  onClick={submit}
                  className="gold-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-black disabled:opacity-35"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Verify footage and create invoice
                </button>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="dashboard-panel p-4">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-white/30">
              Live brief health
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div
                className={cn(
                  "text-4xl font-black",
                  assessment.ambiguityScore === 0
                    ? "text-emerald-300"
                    : assessment.readyForProduction
                      ? "text-amber-300"
                      : "text-rose-300",
                )}
              >
                {assessment.ambiguityScore}
              </div>
              <div className="pb-1 text-xs text-white/30">ambiguity / 100</div>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/40">
              Production stays locked when the brief contains a material
              conflict. Warnings remain visible for informed confirmation.
            </p>
          </div>
          <div className="dashboard-panel p-4">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-white/30">
              Current package
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-black">{tier.name}</div>
                <div className="mt-1 text-xs text-white/35">{tier.label}</div>
              </div>
              <div className="text-xl font-black text-gold-300">
                ${tier.priceUsd}
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-white/45">
              <li>{tier.sourceMinutes} source minutes</li>
              <li>{tier.finalSeconds} finished seconds</li>
              <li>{tier.outputVariants} output variant(s)</li>
              <li>{tier.resolution} maximum included resolution</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] p-4 text-xs leading-5 text-cyan-100/60">
            Payment is requested only after the brief and footage pass
            validation. Expensive analysis and rendering do not start before
            payment confirmation.
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/40">{description}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[.12em] text-white/45">
      {children}
    </span>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-12 rounded-xl border px-3 text-left text-xs font-semibold",
        selected
          ? "border-gold-400/30 bg-gold-400/10 text-gold-200"
          : "border-white/8 bg-white/[.02] text-white/55",
      )}
    >
      {children}
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="text-sm">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none focus:border-gold-400/35"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="text-sm">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 leading-6 outline-none focus:border-gold-400/35"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#0d0e12] px-4 outline-none focus:border-gold-400/35"
      >
        {options.map(([key, optionLabel]) => (
          <option key={key} value={key}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.02] p-4">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-white/30">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-white/65">{value}</p>
    </div>
  );
}
