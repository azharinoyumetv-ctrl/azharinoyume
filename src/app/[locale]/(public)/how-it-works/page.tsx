import {
  CheckCircle,
  ClipboardCheck,
  Download,
  Film,
  ScanSearch,
  ShieldCheck,
  Upload,
} from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: ClipboardCheck,
    title: "Define the outcome",
    desc: "Choose a tier, purpose, style, audience, priorities, exclusions, and delivery format.",
    detail: [
      "Inline questions clarify the style before upload",
      "Platform presets choose safe format defaults",
      "Material conflicts must be resolved before checkout",
    ],
  },
  {
    num: "02",
    icon: Upload,
    title: "Verify the footage",
    desc: "Upload directly to private object storage and confirm the immutable production brief.",
    detail: [
      "Multipart upload with browser-side SHA-256",
      "Server verifies media type, size, and duration",
      "Tier limits are checked before payment",
    ],
  },
  {
    num: "03",
    icon: ShieldCheck,
    title: "Pay the project invoice",
    desc: "One project creates one invoice. Expensive compute remains locked until payment is confirmed.",
    detail: [
      "Signed gateway webhook is the payment authority",
      "The payment is reconciled to the project invoice",
      "Refund exposure follows the completed production stage",
    ],
  },
  {
    num: "04",
    icon: ScanSearch,
    title: "Understand and plan",
    desc: "The engine analyzes the footage, compiles the brief, and produces a deterministic edit plan.",
    detail: [
      "Scene, speech, quality, and highlight analysis",
      "Tier-controlled story and creative planning",
      "Structured timeline manifest—not a prompt sent straight to rendering",
    ],
  },
  {
    num: "05",
    icon: Film,
    title: "Render and verify the draft",
    desc: "A low-cost draft passes automated QA before it reaches the customer.",
    detail: [
      "Queue position and honest ETA remain visible",
      "Captions, audio, safe areas, duration, and file integrity are checked",
      "Risky or low-confidence work escalates to an operator",
    ],
  },
  {
    num: "06",
    icon: Download,
    title: "Revise, approve, and deliver",
    desc: "In-scope corrections patch the approved plan, then the final output is securely delivered.",
    detail: [
      "Consolidated revision rounds protect the scope",
      "New requirements receive a new quote",
      "Final files use authenticated, short-lived delivery links",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-gold-400">
          Automated post-production
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-6xl">
          From raw footage to a controlled finished edit.
        </h1>
        <p className="mt-5 text-base leading-7 text-white/45 sm:text-lg">
          The customer directs the result. Azyume understands, plans, edits,
          checks, and delivers it.
        </p>
      </div>
      <div className="space-y-4 sm:space-y-6">
        {STEPS.map(({ num, icon: Icon, title, desc, detail }) => (
          <article
            key={num}
            className="glass flex flex-col gap-4 rounded-2xl border border-white/5 p-5 min-[480px]:flex-row sm:gap-6 sm:p-8"
          >
            <div className="gold-gradient flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-black text-black sm:h-14 sm:w-14 sm:rounded-2xl sm:text-lg">
              {num}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-3">
                <Icon className="h-5 w-5 flex-shrink-0 text-gold-400" />
                <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
              </div>
              <p className="mb-4 text-muted-foreground">{desc}</p>
              <ul className="space-y-2">
                {detail.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
