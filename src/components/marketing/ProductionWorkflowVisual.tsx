"use client";

import { useEffect, useState } from "react";
import { Check, FileCheck2, Film, LockKeyhole, Upload } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Upload verified", note: "Private multipart upload and media inspection", icon: Upload },
  { label: "Brief compiled", note: "Selections become a validated production contract", icon: FileCheck2 },
  { label: "Timeline planned", note: "Grounded source ranges, B-roll, music, and brand rules", icon: Film },
  { label: "Output verified", note: "Technical and creative QA gate every deliverable", icon: Check },
];

export default function ProductionWorkflowVisual() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % STAGES.length), 3000);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);
  return (
    <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#0a0c10] p-4 shadow-[0_40px_120px_rgba(0,0,0,.55)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.12),transparent_23rem),radial-gradient(circle_at_10%_85%,rgba(245,184,52,.10),transparent_20rem)]" />
      <div className="relative flex items-center justify-between border-b border-white/8 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200/60">Production workflow</p><p className="mt-1 text-sm font-bold text-white/80">The actual order path—not a simulated editor</p></div><LockKeyhole className="h-4 w-4 text-emerald-300" /></div>
      <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
        {STAGES.map(({ label, note, icon: Icon }, index) => <button key={label} onClick={() => setActive(index)} aria-pressed={active === index} className={cn("min-h-32 rounded-xl border p-4 text-left transition-all", active === index ? "border-cyan-200/25 bg-cyan-200/[.07]" : "border-white/7 bg-white/[.02] hover:bg-white/[.04]")}><span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", active === index ? "border-cyan-200/25 bg-cyan-200/10 text-cyan-100" : "border-white/10 text-white/40")}><Icon className="h-4 w-4" /></span><span className="mt-5 block text-sm font-black">{label}</span><span className="mt-1 block text-[11px] leading-5 text-white/38">{note}</span></button>)}
      </div>
      <motion.div key={STAGES[active].label} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.045] p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-200/70">Workflow stage</p><p className="mt-2 text-sm font-bold">{STAGES[active].label}</p><p className="mt-1 text-xs leading-5 text-white/40">{STAGES[active].note}</p></motion.div>
    </div>
  );
}
