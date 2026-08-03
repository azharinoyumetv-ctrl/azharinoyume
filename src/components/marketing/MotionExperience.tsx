"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Film,
  Layers3,
  LockKeyhole,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.72,
        delay: reduceMotion ? 0 : delay,
        ease: EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

const PREVIEWS = [
  {
    label: "Cinematic narrative",
    note: "Measured pace · shaped contrast",
    position: "0% 0%",
    accent: "#f6c453",
  },
  {
    label: "Kinetic action",
    note: "Beat sync · speed control",
    position: "50% 0%",
    accent: "#67e8f9",
  },
  {
    label: "Creator social",
    note: "Hook first · caption safe",
    position: "100% 100%",
    accent: "#c4b5fd",
  },
];

export function HeroVisual() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4, -4]), {
    stiffness: 130,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 130,
    damping: 22,
  });

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(
      () => setActive((current) => (current + 1) % PREVIEWS.length),
      4200,
    );
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  return (
    <motion.div
      data-testid="hero-edit-preview"
      className="relative min-h-[30rem] sm:min-h-[36rem]"
      style={
        reduceMotion
          ? undefined
          : { rotateX, rotateY, transformPerspective: 1100 }
      }
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
        pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <div className="absolute inset-x-[3%] top-[2%] h-[78%] overflow-hidden rounded-[1.7rem] border border-white/12 bg-[#0a0c10] shadow-[0_40px_120px_rgba(0,0,0,.62)] sm:inset-x-[9%]">
        <motion.div
          key={PREVIEWS[active].position}
          className="absolute inset-0 bg-cover"
          initial={reduceMotion ? false : { opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{
            backgroundImage: "url('/media/style-sprite-v1.webp')",
            backgroundSize: "300% 200%",
            backgroundPosition: PREVIEWS[active].position,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.26),transparent_35%,rgba(0,0,0,.86))]" />
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/[.07] to-transparent blur-sm"
          animate={reduceMotion ? undefined : { x: ["-180%", "850%"] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.7)]" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            <span className="ml-2 text-[9px] font-black uppercase tracking-[.18em] text-white/40">
              Edit preview
            </span>
          </div>
          <span className="font-mono text-[9px] text-white/40">
            00:00:1{active + 2}:18
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.15em] text-white/70 backdrop-blur">
              Scene 0{active + 1}
            </span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: PREVIEWS[active].accent }}
            >
              Live direction
            </span>
          </div>
          <motion.p
            key={PREVIEWS[active].label}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black tracking-[-.035em] sm:text-3xl"
          >
            {PREVIEWS[active].label}
          </motion.p>
          <p className="mt-1 text-xs text-white/48">{PREVIEWS[active].note}</p>
          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              key={active}
              className="h-full rounded-full"
              style={{ backgroundColor: PREVIEWS[active].accent }}
              initial={{ width: reduceMotion ? "100%" : "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: reduceMotion ? 0 : 4.2, ease: "linear" }}
            />
          </div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-[1%] left-0 w-[42%] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0d0f13] shadow-2xl"
        animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="aspect-[4/5] bg-cover"
          style={{
            backgroundImage: "url('/media/style-sprite-v1.webp')",
            backgroundSize: "300% 200%",
            backgroundPosition: "100% 100%",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 text-sm font-black">
          Vertical cut
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/65">
          9:16
        </span>
      </motion.div>

      <motion.div
        className="absolute bottom-0 right-0 w-[51%] overflow-hidden rounded-[1.25rem] border border-cyan-200/20 bg-[#071216] p-4 shadow-2xl sm:p-5"
        animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="absolute inset-0 bg-[repeating-radial-gradient(ellipse_at_80%_40%,transparent_0_13%,rgba(103,232,249,.11)_13.5%_14%,transparent_14.5%_24%)] motion-safe:animate-[sphereDrift_9s_ease-in-out_infinite]" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
          <Layers3 className="h-4 w-4" />
        </span>
        <span className="relative mt-9 block text-[9px] font-black uppercase tracking-[.16em] text-cyan-200/60">
          Interactive workspace
        </span>
        <span className="relative mt-1 flex items-center justify-between gap-2 text-base font-black sm:text-lg">
          360 Reframe <ArrowRight className="h-4 w-4" />
        </span>
      </motion.div>

      <div className="absolute right-[4%] top-[75%] z-20 flex gap-2 sm:right-[8%]">
        {PREVIEWS.map((preview, index) => (
          <button
            key={preview.label}
            onClick={() => setActive(index)}
            aria-label={`Preview ${preview.label}`}
            aria-pressed={active === index}
            className={cn(
              "h-8 min-h-8 rounded-full border transition-all",
              active === index
                ? "w-10 border-white/30 bg-white"
                : "w-8 border-white/12 bg-black/45 hover:border-white/25",
            )}
          >
            <span className="sr-only">{preview.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function KineticTicker({ show360 = false }: { show360?: boolean }) {
  const reduceMotion = useReducedMotion();
  const items = [
    "Cinematic pacing",
    "Human review",
    "Music ducking",
    "Private delivery",
    "Vertical-first cuts",
    ...(show360 ? ["360 reframe"] : []),
  ];
  return (
    <div
      className="overflow-hidden border-y border-white/[.06] bg-white/[.018] py-3"
      aria-label="Production capabilities"
    >
      <motion.div
        className="flex w-max items-center"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex items-center gap-5 px-5 text-[10px] font-black uppercase tracking-[.2em] text-white/35 sm:px-7"
          >
            <span>{item}</span>
            <Sparkles className="h-3 w-3 text-amber-200/65" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export type DirectionPreview = { label: string; position: string };

export function DirectionGallery({
  directions,
}: {
  directions: DirectionPreview[];
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {directions.map((direction, index) => (
        <motion.div
          key={direction.label}
          initial={reduceMotion ? false : { opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
          whileHover={reduceMotion ? undefined : { y: -8 }}
        >
          <Link
            href="/style-gallery"
            className="group relative block min-h-72 overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-[#0d0f13] shadow-[0_20px_55px_rgba(0,0,0,.18)] transition-[border-color,box-shadow] duration-500 hover:border-white/20 hover:shadow-[0_30px_80px_rgba(0,0,0,.4)]"
          >
            <motion.div
              className="absolute inset-0 bg-cover"
              whileHover={reduceMotion ? undefined : { scale: 1.07 }}
              transition={{ duration: 0.8, ease: EASE }}
              style={{
                backgroundImage: "url('/media/style-sprite-v1.webp')",
                backgroundSize: "300% 200%",
                backgroundPosition: direction.position,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
            <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 backdrop-blur transition-colors group-hover:bg-white group-hover:text-black">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="text-2xl font-black">{direction.label}</span>
              <div className="mt-4 h-px origin-left scale-x-0 bg-white/70 transition-transform duration-500 group-hover:scale-x-100" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

const FLOW = [
  { title: "Upload", copy: "Verified multipart transfer", icon: Upload },
  { title: "Direct", copy: "Style or spherical camera path", icon: Film },
  { title: "Render", copy: "Queue-backed processing", icon: Sparkles },
  { title: "Deliver", copy: "Private expiring links", icon: LockKeyhole },
];

export function ProductionFlow({ show360 = false }: { show360?: boolean }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(
      () => setActive((current) => (current + 1) % FLOW.length),
      2200,
    );
    return () => window.clearInterval(interval);
  }, [reduceMotion]);
  return (
    <div className="relative mt-9 overflow-hidden rounded-[1.5rem] border border-white/[.07] bg-[#090b0e] p-2 sm:p-3">
      <div className="absolute left-[12.5%] right-[12.5%] top-[3.35rem] hidden h-px bg-white/10 md:block">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-300 to-cyan-300"
          animate={{ width: `${(active / (FLOW.length - 1)) * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
        />
      </div>
      <div className="relative grid gap-2 md:grid-cols-4">
        {FLOW.map(({ title, copy, icon: Icon }, index) => (
          <button
            key={title}
            onClick={() => setActive(index)}
            aria-pressed={active === index}
            className={cn(
              "group relative min-h-44 rounded-[1.1rem] border p-5 text-left transition-all duration-500 sm:p-6",
              active === index
                ? "border-cyan-200/20 bg-cyan-200/[.055] shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_16px_45px_rgba(0,0,0,.22)]"
                : "border-transparent bg-white/[.018] hover:bg-white/[.035]",
            )}
          >
            <span
              className={cn(
                "relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-500",
                active === index
                  ? "border-cyan-200/30 bg-cyan-200/12 text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,.14)]"
                  : "border-white/10 bg-black/20 text-white/40",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="absolute right-5 top-5 font-mono text-[10px] text-white/20">
              0{index + 1}
            </span>
            <span className="mt-8 block text-lg font-black">{title}</span>
            <span className="mt-2 block text-xs leading-5 text-white/38">
              {title === "Direct" && !show360 ? "Guided production brief" : copy}
            </span>
            {active === index && (
              <motion.span
                layoutId="flow-active"
                className="absolute inset-x-5 bottom-3 h-0.5 rounded-full bg-cyan-200"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MotionCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { scale: 1.025 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
    >
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}

export function AnimatedFact({
  value,
  label,
  delay = 0,
}: {
  value: string;
  label: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="group relative overflow-hidden bg-[#090a0d] px-3 py-5 text-center sm:py-6"
      initial={reduceMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/[.045] to-transparent"
        animate={reduceMotion ? undefined : { x: ["-180%", "700%"] }}
        transition={{
          duration: 5,
          delay: delay * 4,
          repeat: Infinity,
          repeatDelay: 2.5,
        }}
      />
      <div className="relative text-xl font-black sm:text-2xl">{value}</div>
      <div className="relative mt-1 text-[8px] font-bold uppercase tracking-[.14em] text-white/28 sm:text-[9px]">
        {label}
      </div>
    </motion.div>
  );
}

export function CheckBadge({ children }: { children: ReactNode }) {
  return (
    <motion.span className="flex items-center gap-2" whileHover={{ x: 3 }}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300/15 bg-emerald-300/[.06]">
        <Check className="h-3 w-3 text-emerald-300" />
      </span>
      {children}
    </motion.span>
  );
}
