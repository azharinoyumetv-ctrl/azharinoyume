"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers3, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type StyleDirection = {
  slug: string;
  title: string;
  description: string;
  meta: string[];
  position: string;
  category: "Story" | "Brand" | "Social";
  featured?: boolean;
};

const FILTERS = ["All", "Story", "Brand", "Social"] as const;

export default function InteractiveStyleGrid({
  styles,
  show360 = false,
}: {
  styles: StyleDirection[];
  show360?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const visibleStyles = useMemo(
    () =>
      filter === "All"
        ? styles
        : styles.filter((style) => style.category === filter),
    [filter, styles],
  );

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/30">
            Selected work
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-.03em] sm:text-3xl">
            Choose the visual language
          </h2>
        </div>
        <div
          className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[.07] bg-white/[.025] p-1"
          aria-label="Filter editing directions"
        >
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={cn(
                "relative min-h-10 shrink-0 rounded-lg px-3 text-[10px] font-black uppercase tracking-[.12em] transition-colors",
                filter === item
                  ? "text-black"
                  : "text-white/38 hover:text-white",
              )}
            >
              {filter === item && (
                <motion.span
                  layoutId="style-filter"
                  className="absolute inset-0 rounded-lg bg-white"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <span className="relative">{item}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleStyles.map((style, index) => (
            <motion.article
              key={style.slug}
              layout
              initial={
                reduceMotion ? false : { opacity: 0, scale: 0.96, y: 18 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, y: -14 }
              }
              transition={{ duration: 0.42, delay: index * 0.045 }}
              className={
                style.featured && filter === "All"
                  ? "xl:col-span-6"
                  : filter === "All"
                    ? "xl:col-span-4"
                    : "xl:col-span-4"
              }
            >
              <Link
                href={`/order?style=${style.slug}`}
                className="group relative block min-h-[21rem] overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-[#0d0f13] shadow-[0_18px_50px_rgba(0,0,0,.18)] transition-[border-color,box-shadow] duration-500 hover:border-white/20 hover:shadow-[0_30px_90px_rgba(0,0,0,.45)]"
              >
                <motion.div
                  className="absolute inset-0 bg-cover"
                  whileHover={reduceMotion ? undefined : { scale: 1.065 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    backgroundImage: "url('/media/style-sprite-v1.webp')",
                    backgroundSize: "300% 200%",
                    backgroundPosition: style.position,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
                <motion.div
                  aria-hidden
                  className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/[.08] to-transparent opacity-0 blur-sm group-hover:opacity-100"
                  initial={{ x: "-200%" }}
                  whileHover={reduceMotion ? undefined : { x: "900%" }}
                  transition={{ duration: 1.2 }}
                />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-black">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                  <span className="flex h-11 w-11 translate-y-1 items-center justify-center rounded-full border border-white/15 bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {style.meta.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/65 backdrop-blur"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-black tracking-[-.035em] sm:text-3xl">
                    {style.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
                    {style.description}
                  </p>
                  <div className="mt-5 h-px origin-left scale-x-0 bg-white/70 transition-transform duration-500 group-hover:scale-x-100" />
                </div>
              </Link>
            </motion.article>
          ))}
        </AnimatePresence>

        {filter === "All" && show360 && (
          <motion.article
            layout
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="group relative min-h-[21rem] overflow-hidden rounded-[1.35rem] border border-cyan-300/15 bg-[#071014] md:col-span-2 xl:col-span-8"
          >
            <Link href="/360-editor" className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,.18),transparent_58%),repeating-radial-gradient(ellipse_at_center,transparent_0_12%,rgba(103,232,249,.09)_12.5%_13%,transparent_13.5%_22%),repeating-linear-gradient(90deg,transparent_0_9%,rgba(103,232,249,.08)_9.5%_10%,transparent_10.5%_20%)] transition-transform duration-1000 group-hover:scale-[1.08] motion-safe:animate-[sphereDrift_10s_ease-in-out_infinite]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent" />
              <motion.div
                aria-hidden
                className="absolute right-[-6%] top-1/2 aspect-square w-[72%] -translate-y-1/2 rounded-full border border-cyan-200/20 shadow-[inset_0_0_80px_rgba(34,211,238,.09),0_0_80px_rgba(34,211,238,.08)]"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative flex h-full min-h-[21rem] max-w-xl flex-col justify-end p-5 sm:p-7">
                <span className="mb-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-200/10 text-cyan-100 backdrop-blur transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                  <Layers3 className="h-5 w-5" />
                </span>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {["360°", "Virtual camera", "Keyframes"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-cyan-100/15 bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-cyan-50/70"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <h3 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">
                  Spherical reframe
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
                  Direct the viewer after the shoot. Animate yaw, pitch, roll,
                  and field of view, then deliver a normal flat video.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-100">
                  Enter the studio{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.article>
        )}
      </motion.div>
    </>
  );
}
