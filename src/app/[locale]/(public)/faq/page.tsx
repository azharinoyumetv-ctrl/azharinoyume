"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "How does pricing work?", a: "Buy a one-time credit pack or choose a recurring creator plan. Before checkout, the server converts the USD catalog price to IDR and locks the quote for 15 minutes." },
  { q: "What payment methods do you accept?", a: "The available methods are controlled by the platform administrator. DOKU supports Indonesian Checkout, Xendit v3 supports QRIS and e-wallets, and Payoneer can be enabled for hosted-link payments that are credited after verification. Recurring plans remain limited to tokenized Xendit cards after merchant activation." },
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
  return <div className="glass border border-white/5 rounded-2xl overflow-hidden"><button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6 text-left"><span className="font-medium pr-4">{q}</span><ChevronDown className={cn("w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")} /></button>{open && <div className="px-6 pb-6 text-muted-foreground text-sm leading-relaxed border-t border-white/5 pt-4">{a}</div>}</div>;
}

export default function FAQPage() {
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24"><div className="text-center mb-16"><h1 className="text-5xl font-black mb-4">FAQ</h1><p className="text-muted-foreground">Clear answers about credits, payments, rendering, and privacy.</p></div><div className="space-y-3">{FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}</div></div>;
}
