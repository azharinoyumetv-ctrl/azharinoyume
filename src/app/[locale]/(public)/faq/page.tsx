"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "Do I need to pay before my video is edited?", a: "Yes. Payment is confirmed first — always. Your footage is never processed before payment. This is a strict business rule we enforce at every step." },
  { q: "How long does delivery take?", a: "Most orders are processed within 2–8 hours depending on queue depth and complexity. You will see a live ETA and queue position on your order status page after payment." },
  { q: "What payment methods do you accept?", a: "Xendit (Indonesia and Southeast Asia), Payoneer (global), and Wise (international bank transfer). Stripe is coming soon for EU/US customers." },
  { q: "What languages can I write my instructions in?", a: "Any language. The website supports English, Japanese, Indonesian, Korean, Russian, French, Simplified Chinese, and Traditional Chinese. Our AI translates your instructions to English internally for editing." },
  { q: "How many revisions do I get?", a: "Basic: 1 revision. Plus: 2 revisions. Premium: 3 revisions. Extra revisions are available as an add-on for $15 each." },
  { q: "What file formats do you accept?", a: "MP4, MOV, AVI, MXF, and most common video formats. Maximum upload size is 10GB. You can also share a Google Drive, Dropbox, or WeTransfer link." },
  { q: "What resolution and aspect ratio can I get?", a: "Basic and Plus: up to 1080p. Premium: up to 4K. All aspect ratios: 16:9, 9:16, 1:1, 4:5, or custom. 4K for Basic/Plus is a $25 add-on." },
  { q: "Do you add music to my video?", a: "Yes, if you select a music style. We use royalty-free licensed music matched to your selected style and mood. You can also request no music." },
  { q: "What if I'm not happy with the final result?", a: "Use your included revisions to request changes. After all revisions are used, additional revisions cost $15. If there is a clear error on our side, we will resolve it at no cost." },
  { q: "Is my footage kept private?", a: "Yes. All files are stored in Cloudflare R2 with private access only. Signed URLs expire after a set time. We never share your footage, prompt, or personal details without your explicit consent." },
  { q: "Can I see examples of your work?", a: "Visit the Style Gallery and Testimonials page. All examples shown are approved by customers who gave explicit consent to showcase their work." },
  { q: "Can I cancel after placing an order?", a: "If processing has not started (payment pending or upload pending), contact us within 1 hour for a refund. Once editing has started, refunds are not possible as processing costs have been incurred." },
  { q: "How do I track my order?", a: "After payment, you receive a link to your Order Status page. It shows live queue position, current processing step, estimated completion time, and draft/final download links." },
  { q: "What is the Wise payment option?", a: "Wise is an international bank transfer option. You transfer the exact invoice amount with your Order ID as reference. Processing starts after manual verification (typically 1–4 hours). EU/UK customers using Wise always require admin approval before processing starts." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass border border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <span className="font-medium pr-4">{q}</span>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-6 pb-6 text-muted-foreground text-sm leading-relaxed border-t border-white/5 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">FAQ</h1>
        <p className="text-muted-foreground">Common questions about our AI video editing service.</p>
      </div>
      <div className="space-y-3">
        {FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
      </div>
    </div>
  );
}
