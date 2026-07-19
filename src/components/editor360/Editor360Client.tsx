"use client";

import { createSHA256 } from "hash-wasm";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleGauge,
  Film,
  KeyRound,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  Rotate3D,
  Upload,
  Video,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cameraAt,
  type CameraKeyframe,
  type Editor360Config,
} from "@/lib/video360/contracts";
import SphericalVideoViewport from "./SphericalVideoViewport";

const INITIAL_CAMERA: CameraKeyframe = {
  timeMs: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  fov: 90,
};
const TIERS = {
  plus: { label: "Studio", rate: 6 },
  premium: { label: "Studio Pro", rate: 13 },
} as const;
type Tier = keyof typeof TIERS;

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}.${Math.floor((seconds % 1) * 10)}`;
}

async function hashFile(file: File, onProgress: (value: number) => void) {
  const hasher = await createSHA256();
  const chunkSize = 8 * 1024 * 1024;
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    hasher.update(
      new Uint8Array(
        await file.slice(offset, offset + chunkSize).arrayBuffer(),
      ),
    );
    onProgress(
      Math.round((Math.min(file.size, offset + chunkSize) / file.size) * 12),
    );
  }
  return hasher.digest();
}

export default function Editor360Client() {
  const { status } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [camera, setCamera] = useState(INITIAL_CAMERA);
  const [keyframes, setKeyframes] = useState<CameraKeyframe[]>([
    INITIAL_CAMERA,
  ]);
  const [sourceProjection, setSourceProjection] =
    useState<Editor360Config["sourceProjection"]>("equirectangular");
  const [stereoMode, setStereoMode] =
    useState<Editor360Config["stereoMode"]>("mono");
  const [outputAspectRatio, setOutputAspectRatio] =
    useState<Editor360Config["outputAspectRatio"]>("16:9");
  const [tier, setTier] = useState<Tier>("plus");
  const [title, setTitle] = useState("360 reframe project");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    orderId: string;
    credits: number;
  } | null>(null);

  useEffect(() => {
    setVideoElement(videoRef.current);
  }, [sourceUrl]);
  useEffect(
    () => () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );
  useEffect(() => {
    if (!playing) return;
    let animation = 0;
    const sync = () => {
      const video = videoRef.current;
      if (video) {
        const timeMs = Math.round(video.currentTime * 1000);
        setCurrentTimeMs(timeMs);
        setCamera(cameraAt(keyframes, timeMs));
        if (!video.paused && !video.ended)
          animation = requestAnimationFrame(sync);
        else setPlaying(false);
      }
    };
    animation = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(animation);
  }, [playing, keyframes]);

  const editorConfig = useMemo<Editor360Config>(
    () => ({ sourceProjection, stereoMode, outputAspectRatio, keyframes }),
    [sourceProjection, stereoMode, outputAspectRatio, keyframes],
  );
  const previewAspect =
    outputAspectRatio === "16:9"
      ? 16 / 9
      : outputAspectRatio === "9:16"
        ? 9 / 16
        : 1;

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const nextUrl = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setSourceUrl(nextUrl);
    setKeyframes([INITIAL_CAMERA]);
    setCamera(INITIAL_CAMERA);
    setCurrentTimeMs(0);
    setError("");
  }

  function seek(timeMs: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeMs / 1000;
    setCurrentTimeMs(timeMs);
    setCamera(cameraAt(keyframes, timeMs));
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function updateCamera(next: CameraKeyframe) {
    const positioned = { ...next, timeMs: currentTimeMs };
    setCamera(positioned);
  }

  function addKeyframe() {
    const next = [
      ...keyframes.filter(
        (frame) => Math.abs(frame.timeMs - currentTimeMs) > 80,
      ),
      { ...camera, timeMs: currentTimeMs },
    ].sort((a, b) => a.timeMs - b.timeMs);
    setKeyframes(next);
  }

  function updateCameraValue(
    key: "yaw" | "pitch" | "roll" | "fov",
    value: number,
  ) {
    updateCamera({ ...camera, [key]: value });
  }

  async function submitProject() {
    if (!file) {
      setError("Import a 360 video before rendering.");
      return;
    }
    if (status !== "authenticated") {
      await signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    setBusy(true);
    setError("");
    setProgress(1);
    try {
      const orderResponse = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `order-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          tier,
          purpose: title,
          visualStyle: "360 Reframe",
          editingMode: "360",
          editorConfig,
          aspectRatio: outputAspectRatio,
          resolution: "1080p",
          frameRate: "30fps",
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok)
        throw new Error(order.error || "Could not create the 360 project");
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
        partNumber += 1
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
        if (!etag) throw new Error("R2 CORS must expose ETag");
        parts.push({ partNumber, etag });
        setProgress(12 + Math.round((partNumber / upload.expectedParts) * 70));
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
        throw new Error(completed.error || "360 video verification failed");
      setProgress(88);
      const quoteResponse = await fetch("/api/v1/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "RENDER", assetId: upload.assetId, tier }),
      });
      const quote = await quoteResponse.json();
      if (!quoteResponse.ok)
        throw new Error(quote.error || "Could not quote render");
      const renderResponse = await fetch(`/api/v1/orders/${order.id}/render`, {
        method: "POST",
        headers: { "Idempotency-Key": `render-${crypto.randomUUID()}` },
      });
      const render = await renderResponse.json();
      if (!renderResponse.ok)
        throw new Error(render.error || "Could not queue 360 render");
      setProgress(100);
      setResult({ orderId: order.id, credits: quote.credits });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "360 project submission failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (result)
    return (
      <div className="dashboard-backdrop flex min-h-svh items-center justify-center px-4 py-16">
        <div className="dashboard-panel max-w-lg p-7 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <Check className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-black">360 render queued</h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            Your camera path is saved. {result.credits} credits are reserved
            until the output is verified.
          </p>
          <Link
            href={`/order/${result.orderId}`}
            className="gold-gradient mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-xl px-6 font-bold text-black"
          >
            Track render <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-svh bg-[#07080b] text-white">
      <video
        ref={videoRef}
        src={sourceUrl || undefined}
        className="hidden"
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = Math.round(event.currentTarget.duration * 1000);
          setDurationMs(nextDuration);
        }}
        onEnded={() => setPlaying(false)}
      />
      <header className="border-b border-white/[.07] bg-[#0b0d11] px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              aria-label="Back to Azyume Cut AI"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.025] text-white/55 transition-colors hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 xs:flex">
              <Rotate3D className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-bold sm:text-base">
                  360 Reframe Studio
                </h1>
                <span className="hidden items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-emerald-300 sm:inline-flex">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  </span>
                  Interactive preview
                </span>
              </div>
              <p className="hidden truncate text-[11px] text-white/35 xs:block">
                Azyume Cut AI · spherical camera workspace
              </p>
            </div>
          </div>
          <button
            disabled={busy || !file}
            onClick={submitProject}
            className="gold-gradient flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-black transition-transform active:scale-[.97] disabled:opacity-35 sm:px-5"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === "authenticated" ? (
              <Film className="h-4 w-4" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {status === "authenticated"
                ? "Queue render"
                : "Sign in to render"}
            </span>
            <span className="sm:hidden">Render</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-3 p-3 xl:grid-cols-[17rem_minmax(0,1fr)_19rem] xl:gap-0 xl:p-0">
        <aside className="order-2 rounded-2xl border border-white/[.07] bg-[#0c0e12] p-4 xl:order-1 xl:min-h-[calc(100svh-4.6rem)] xl:rounded-none xl:border-y-0 xl:border-l-0 xl:p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-white/35">
            <Video className="h-3.5 w-3.5" /> Source media
          </div>
          <label className="group mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/[.035] px-4 text-center transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-300/[.06]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.06] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
              <Upload className="h-4 w-4 text-cyan-200" />
            </span>
            <span className="mt-3 max-w-full truncate text-sm font-semibold">
              {file?.name || "Import 360 video"}
            </span>
            <span className="mt-1 text-[11px] text-white/30">
              MP4 or MOV · up to 10 GB
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
            />
          </label>
          <div className="mt-6 space-y-5">
            <label className="block text-[10px] font-bold uppercase tracking-[.14em] text-white/35">
              Projection
              <select
                value={sourceProjection}
                onChange={(event) =>
                  setSourceProjection(
                    event.target.value as Editor360Config["sourceProjection"],
                  )
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white"
              >
                <option value="equirectangular">Equirectangular 2:1</option>
                <option value="dual_fisheye">Dual fisheye</option>
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-[.14em] text-white/35">
              Stereo layout
              <select
                value={stereoMode}
                onChange={(event) =>
                  setStereoMode(
                    event.target.value as Editor360Config["stereoMode"],
                  )
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white"
              >
                <option value="mono">Monoscopic</option>
                <option value="top_bottom">Top / bottom</option>
                <option value="side_by_side">Side by side</option>
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-[.14em] text-white/35">
              Project name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white"
              />
            </label>
          </div>
          <div className="mt-6 rounded-xl border border-white/[.06] bg-white/[.025] p-3 text-[11px] leading-5 text-white/35">
            <div className="flex items-center gap-2 font-bold text-white/60">
              <CircleGauge className="h-4 w-4 text-cyan-200" /> Source status
            </div>
            <div className="mt-2 flex justify-between">
              <span>Duration</span>
              <span className="font-mono text-white/60">
                {formatTime(durationMs)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Camera points</span>
              <span className="font-mono text-white/60">
                {keyframes.length}
              </span>
            </div>
          </div>
        </aside>

        <main className="order-1 min-w-0 xl:order-2 xl:min-h-[calc(100svh-4.6rem)]">
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-white/[.07] bg-[#030406] xl:rounded-none xl:border-y-0 xl:border-l-0">
            <div
              className="relative max-w-full overflow-hidden bg-[#06070a]"
              style={{
                aspectRatio: previewAspect,
                width: `min(100%, calc(68svh * ${previewAspect}))`,
              }}
            >
              {videoElement && sourceUrl ? (
                <SphericalVideoViewport
                  video={videoElement}
                  camera={camera}
                  projection={sourceProjection}
                  onCameraChange={updateCamera}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(34,211,238,.10),transparent_57%)] px-6 text-center">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:2.5rem_2.5rem]"
                  />
                  <div
                    aria-hidden
                    className="relative h-28 w-28 motion-safe:animate-[sphereDrift_7s_ease-in-out_infinite] sm:h-32 sm:w-32"
                  >
                    <span className="absolute inset-0 rounded-full border border-cyan-200/25 shadow-[inset_0_0_34px_rgba(34,211,238,.11),0_0_42px_rgba(34,211,238,.08)]" />
                    <span className="absolute inset-[8%] rounded-[50%] border border-cyan-100/15 [transform:rotateX(64deg)]" />
                    <span className="absolute inset-[8%] rounded-[50%] border border-cyan-100/15 [transform:rotateY(64deg)]" />
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-100/25 to-transparent motion-safe:animate-[sphereOrbit_8s_linear_infinite]" />
                    <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-cyan-200/20 bg-[#071216]/90 text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,.14)] backdrop-blur">
                      <Rotate3D className="h-5 w-5" />
                    </span>
                  </div>
                  <h2 className="mt-5 text-xl font-bold">
                    Import spherical footage
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/35">
                    Drag inside the viewer to aim the virtual camera. Scroll or
                    pinch controls the field of view.
                  </p>
                </div>
              )}
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/60 backdrop-blur">
                  {outputAspectRatio}
                </span>
                <span className="rounded-lg border border-cyan-300/15 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-200 backdrop-blur">
                  Live sphere
                </span>
              </div>
              <div className="pointer-events-none absolute inset-4 rounded-xl border border-white/12" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-px border-x border-b border-white/[.07] bg-white/[.07]">
            {["Import", "Aim", "Keyframe", "Render"].map((step, index) => {
              const activeStep = file ? 1 : 0;
              const active = index === activeStep;
              return (
                <div
                  key={step}
                  className={`relative bg-[#080a0d] px-2 py-3 text-center transition-colors sm:px-3 ${active ? "text-cyan-100" : "text-white/25"}`}
                >
                  {active && (
                    <span className="absolute inset-x-0 top-0 h-px bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,.5)]" />
                  )}
                  <span className="block font-mono text-[8px] opacity-50">
                    0{index + 1}
                  </span>
                  <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[.11em] sm:text-[10px]">
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-x border-b border-white/[.07] bg-[#0b0d11] p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <button
                disabled={!file}
                onClick={togglePlayback}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              >
                {playing ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>
              <span className="w-14 shrink-0 font-mono text-xs text-white/60">
                {formatTime(currentTimeMs)}
              </span>
              <input
                aria-label="Timeline position"
                type="range"
                min={0}
                max={Math.max(1, durationMs)}
                step={50}
                value={Math.min(currentTimeMs, durationMs || 1)}
                onChange={(event) => seek(Number(event.target.value))}
                className="h-12 min-w-0 flex-1 accent-cyan-300"
              />
              <span className="hidden w-14 shrink-0 text-right font-mono text-xs text-white/35 sm:block">
                {formatTime(durationMs)}
              </span>
            </div>
            <div className="relative mt-1 h-8 overflow-hidden rounded-lg bg-black/35">
              {keyframes.map((frame, index) => (
                <button
                  key={`${frame.timeMs}-${index}`}
                  onClick={() => seek(frame.timeMs)}
                  aria-label={`Keyframe at ${formatTime(frame.timeMs)}`}
                  className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100 bg-cyan-300 shadow-[0_0_7px_rgba(34,211,238,.5)] transition-transform hover:scale-150"
                  style={{
                    left: `${durationMs ? Math.min(99, Math.max(1, (frame.timeMs / durationMs) * 100)) : 1}%`,
                  }}
                />
              ))}
              <div
                className="absolute inset-y-0 w-px bg-white/70"
                style={{
                  left: `${durationMs ? Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
        </main>

        <aside className="order-3 rounded-2xl border border-white/[.07] bg-[#0c0e12] p-4 xl:min-h-[calc(100svh-4.6rem)] xl:rounded-none xl:border-y-0 xl:border-r-0 xl:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-white/35">
              <Maximize2 className="h-3.5 w-3.5" /> Camera inspector
            </div>
            <button
              onClick={addKeyframe}
              disabled={!file}
              className="flex min-h-10 items-center gap-1.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[.06] px-2.5 text-[11px] font-bold text-cyan-200 transition-[border-color,background-color,transform] hover:border-cyan-300/35 hover:bg-cyan-300/10 active:scale-[.97] disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" /> Keyframe
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(
              [
                ["yaw", "Yaw", -180, 180],
                ["pitch", "Pitch", -85, 85],
                ["roll", "Roll", -180, 180],
                ["fov", "Field of view", 35, 140],
              ] as const
            ).map(([key, label, min, max]) => (
              <label
                key={key}
                className="rounded-xl border border-white/[.07] bg-black/20 p-3 text-[10px] font-bold uppercase tracking-[.12em] text-white/35 transition-colors hover:border-cyan-200/15"
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{label}</span>
                  <span className="font-mono text-cyan-200">
                    {Math.round(camera[key])}°
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={camera[key]}
                  onChange={(event) =>
                    updateCameraValue(key, Number(event.target.value))
                  }
                  className="mt-2 h-8 w-full accent-cyan-300"
                />
              </label>
            ))}
          </div>
          <div className="mt-6">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">
              Output canvas
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setOutputAspectRatio(ratio)}
                  className={`min-h-12 rounded-xl border text-xs font-bold transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 active:translate-y-0 ${outputAspectRatio === ratio ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.07)]" : "border-white/[.07] bg-black/20 text-white/40 hover:border-white/15 hover:text-white/70"}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">
              Render quality
            </div>
            <div className="mt-3 space-y-2">
              {Object.entries(TIERS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setTier(key as Tier)}
                  className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-3 text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5 active:translate-y-0 ${tier === key ? "border-amber-300/30 bg-amber-300/[.07] shadow-[0_0_28px_rgba(245,200,66,.06)]" : "border-white/[.07] bg-black/20 hover:border-white/15"}`}
                >
                  <span>
                    <span className="block text-sm font-bold">
                      {value.label}
                    </span>
                    <span className="text-[10px] text-white/35">
                      Lanczos spherical interpolation
                    </span>
                  </span>
                  <span className="text-xs font-bold text-amber-200">
                    {value.rate} cr/s
                  </span>
                </button>
              ))}
            </div>
          </div>
          {busy && (
            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-cyan-300 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                Securing footage and queuing spherical render · {progress}%
              </p>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-3 text-xs leading-5 text-rose-200"
            >
              {error}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
