"use client";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { createSHA256 } from "hash-wasm";
import { Loader2, Upload } from "lucide-react";

const TIERS = { basic: { label: "Basic", rate: 2 }, plus: { label: "Plus", rate: 6 }, premium: { label: "Premium", rate: 13 } } as const;
type Tier = keyof typeof TIERS;

async function hashFile(file: File, onProgress: (value: number) => void) {
  const hasher = await createSHA256(); const chunk = 8 * 1024 * 1024;
  for (let offset = 0; offset < file.size; offset += chunk) { hasher.update(new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer())); onProgress(Math.round((Math.min(file.size, offset + chunk) / file.size) * 15)); }
  return hasher.digest();
}

export default function OrderForm() {
  const { status } = useSession();
  const [tier, setTier] = useState<Tier>("plus"); const [purpose, setPurpose] = useState(""); const [style, setStyle] = useState("Cinematic"); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState(""); const [result, setResult] = useState<{ orderId: string; credits: number } | null>(null);
  async function submit() {
    if (!file) { setError("Choose a video first."); return; }
    setBusy(true); setError("");
    try {
      const orderResponse = await fetch("/api/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `order-${crypto.randomUUID()}` }, body: JSON.stringify({ tier, purpose, visualStyle: style }) });
      const order = await orderResponse.json(); if (!orderResponse.ok) throw new Error(order.error || "Could not create project");
      const checksumSha256 = await hashFile(file, setProgress);
      const uploadResponse = await fetch("/api/v1/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, fileName: file.name, sizeBytes: file.size, mimeType: file.type || "video/mp4", checksumSha256 }) });
      const upload = await uploadResponse.json(); if (!uploadResponse.ok) throw new Error(upload.error || "Could not start upload");
      const parts: { partNumber: number; etag: string }[] = [];
      for (let partNumber = 1; partNumber <= upload.expectedParts; partNumber++) {
        const signResponse = await fetch(`/api/v1/uploads/${upload.assetId}/parts/${partNumber}`, { method: "POST" }); const signed = await signResponse.json(); if (!signResponse.ok) throw new Error(signed.error || "Could not sign upload part");
        const start = (partNumber - 1) * upload.partSizeBytes; const response = await fetch(signed.url, { method: "PUT", body: file.slice(start, Math.min(file.size, start + upload.partSizeBytes)) });
        if (!response.ok) throw new Error(`Upload part ${partNumber} failed`); const etag = response.headers.get("etag"); if (!etag) throw new Error("R2 CORS must expose the ETag response header");
        parts.push({ partNumber, etag }); setProgress(15 + Math.round((partNumber / upload.expectedParts) * 70));
      }
      const completeResponse = await fetch(`/api/v1/uploads/${upload.assetId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parts }) });
      const completed = await completeResponse.json(); if (!completeResponse.ok) throw new Error(completed.error || "Video verification failed"); setProgress(90);
      const quoteResponse = await fetch("/api/v1/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "RENDER", assetId: upload.assetId, tier }) }); const quote = await quoteResponse.json(); if (!quoteResponse.ok) throw new Error(quote.error || "Could not quote render");
      const renderResponse = await fetch(`/api/v1/orders/${order.id}/render`, { method: "POST", headers: { "Idempotency-Key": `render-${crypto.randomUUID()}` } }); const render = await renderResponse.json(); if (!renderResponse.ok) throw new Error(render.error || "Could not queue render");
      setProgress(100); setResult({ orderId: order.id, credits: quote.credits });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Project submission failed"); } finally { setBusy(false); }
  }
  if (status === "unauthenticated") return <div className="max-w-xl mx-auto py-24 text-center"><h1 className="text-4xl font-black">Sign in to create a project</h1><p className="text-muted-foreground mt-3">A magic link keeps uploads, credits, and deliveries private.</p><button onClick={() => signIn("email", { callbackUrl: window.location.href })} className="mt-8 px-7 py-4 gold-gradient text-black font-bold rounded-xl">Email me a sign-in link</button></div>;
  if (result) return <div className="max-w-xl mx-auto py-24 text-center"><h1 className="text-4xl font-black">Render queued</h1><p className="text-muted-foreground mt-3">{result.credits} credits are reserved. They are charged only after a verified output is created.</p><a href={`/order/${result.orderId}`} className="inline-block mt-8 px-7 py-4 gold-gradient text-black font-bold rounded-xl">Track project</a></div>;
  return <div className="max-w-3xl mx-auto px-4 py-12 space-y-8"><div><h1 className="text-4xl font-black">Create a video project</h1><p className="text-muted-foreground mt-2">Upload first; duration and cost are verified by the server before rendering.</p></div>
    <div className="grid sm:grid-cols-3 gap-4">{Object.entries(TIERS).map(([key, value]) => <button key={key} onClick={() => setTier(key as Tier)} className={`p-5 rounded-2xl border text-left ${tier === key ? "border-gold-500 bg-gold-500/10" : "border-white/10 glass"}`}><div className="font-bold">{value.label}</div><div className="text-sm text-muted-foreground mt-1">{value.rate} credits / source second</div></button>)}</div>
    <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Purpose<input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2 w-full px-4 py-3 glass border border-white/10 rounded-xl" placeholder="YouTube lesson, product reel…" /></label><label className="text-sm">Visual style<select value={style} onChange={(e) => setStyle(e.target.value)} className="mt-2 w-full px-4 py-3 glass border border-white/10 rounded-xl"><option>Cinematic</option><option>Minimal</option><option>Corporate</option><option>Energetic</option><option>Anime-inspired</option></select></label></div>
    <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-white/15 rounded-2xl cursor-pointer"><Upload className="mb-2"/><span>{file?.name || "Choose MP4, MOV, or another video"}</span><span className="text-xs text-muted-foreground mt-1">Maximum 10 GB</span><input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
    {busy && <div><div className="h-2 bg-white/10 rounded"><div className="h-2 gold-gradient rounded" style={{ width: `${progress}%` }}/></div><p className="text-sm text-muted-foreground mt-2">Hashing, uploading, and verifying… {progress}%</p></div>}{error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">{error}{error.toLowerCase().includes("credit") && <Link href="/portal/billing" className="block underline mt-2">Add credits</Link>}</div>}
    <button disabled={busy || !file || status === "loading"} onClick={submit} className="w-full py-4 gold-gradient text-black font-bold rounded-xl disabled:opacity-50 flex justify-center gap-2">{busy && <Loader2 className="animate-spin"/>}Verify upload and queue render</button>
  </div>;
}
