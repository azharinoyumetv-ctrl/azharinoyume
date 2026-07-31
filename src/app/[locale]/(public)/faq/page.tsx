"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "How does pricing work?", a: "Buy a one-time credit pack or choose a recurring creator plan. Before checkout, the server converts the USD catalog price to IDR and locks the quote for 15 minutes." },
  { q: "What payment methods do you accept?", a: "The available methods are controlled by the platform administrator. DOKU supports Indonesian Checkout, Xendit v3 supports QRIS and e-wallets, Midtrans Snap supports Indonesian cards, bank transfer, QRIS, and e-wallet checkout, and Payoneer can be enabled for hosted-link payments that are credited after verification. Recurring plans remain limited to tokenized Xendit cards after merchant activation." },
  { q: "When are credits charged?", a: "Credits are reserved before rendering and consumed only after a non-empty output is verified in private storage. If every automatic attempt fails, the reservation is released." },
  { q: "What file formats do you accept?", a: "Most common video formats are accepted, up to 10 GB. The server inspects the uploaded media with FFprobe before it can enter the render queue." },
  { q: "How long does delivery take?", a: "Timing depends on source duration, resolution, and queue depth. You can track the durable render state from upload verification through draft review." },
  { q: "How many revisions do I get?", a: "Basic includes 1 revision, Plus includes 2, and Premium includes 3. Review requests move to a traceable revision workflow." },
  { q: "Is my footage private?", a: "Uploads and outputs stay in private Cloudflare R2 storage. The app creates short-lived signed URLs only when an authenticated user uploads or downloads a file." },
  { q: "What happens when a render fails?", a: "The worker retries automatically. After the final failure, it releases reserved credits, creates a human-review task, and sends an operational alert." },
  { q: "Can I cancel a subscription?", a: "Yes. Cancellation stops the next renewal and keeps the current credit period active until its scheduled end." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return <div className="glass overflow-hidden rounded-2xl border border-white/5"><button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-14 w-full items-center justify-between p-4 text-left sm:p-6"><span className="pr-4 font-medium">{q}</span><ChevronDown className={cn("h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} /></button>{open && <div className="border-t border-white/5 px-4 pt-4 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">{a}</div>}</div>;
}

export default function FAQPage() {
  return <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24"><div className="mb-10 text-center sm:mb-16"><h1 className="mb-4 text-4xl font-black sm:text-5xl">FAQ</h1><p className="text-muted-foreground">Clear answers about credits, payments, rendering, and privacy.</p></div><div className="space-y-3">{FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}</div></div>;
}
