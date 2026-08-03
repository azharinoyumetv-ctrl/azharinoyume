"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "How does pricing work?", a: "Azyume uses one project, one invoice, and one confirmed scope. Before checkout, the server converts the USD catalog price to IDR and locks the quote for 15 minutes." },
  { q: "What payment methods do you accept?", a: "Checkout shows only payment providers that the administrator has enabled and the server has verified as configured. Unavailable providers are never advertised as active." },
  { q: "When does production start?", a: "Production starts only after the project invoice is confirmed paid and the required footage has passed media validation." },
  { q: "What file formats do you accept?", a: "Most common video formats are accepted, up to 10 GB. The server inspects the uploaded media with FFprobe before it can enter the render queue." },
  { q: "How long does delivery take?", a: "Timing depends on source duration, resolution, and queue depth. You can track the durable render state from upload verification through draft review." },
  { q: "How many revisions do I get?", a: "Basic includes 1 revision. Plus and Premium include 2 revisions. Review requests move through a traceable revision workflow." },
  { q: "Is my footage private?", a: "Uploads and outputs stay in private Cloudflare R2 storage. The app creates short-lived signed URLs only when an authenticated user uploads or downloads a file." },
  { q: "What happens when a render fails?", a: "The worker retries automatically. After the final failure, the order is moved to human review and an operational alert is sent. A failed render is not presented as a completed delivery." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return <div className="glass overflow-hidden rounded-2xl border border-white/5"><button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-14 w-full items-center justify-between p-4 text-left sm:p-6"><span className="pr-4 font-medium">{q}</span><ChevronDown className={cn("h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} /></button>{open && <div className="border-t border-white/5 px-4 pt-4 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">{a}</div>}</div>;
}

export default function FAQPage() {
  return <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24"><div className="mb-10 text-center sm:mb-16"><h1 className="mb-4 text-4xl font-black sm:text-5xl">FAQ</h1><p className="text-muted-foreground">Clear answers about projects, payments, rendering, and privacy.</p></div><div className="space-y-3">{FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}</div></div>;
}
