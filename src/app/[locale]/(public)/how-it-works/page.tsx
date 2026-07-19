import { CheckCircle, Upload, CreditCard, Play, Download, WalletCards } from "lucide-react";

const STEPS = [
  { num: "01", icon: WalletCards, title: "Add Credits", desc: "Choose a one-time pack or recurring plan.", detail: ["USD catalog converted to a 15-minute IDR quote", "Admin-configured DOKU, Xendit v3, or Payoneer checkout", "Tokenized recurring cards stay gated to Xendit activation"] },
  { num: "02", icon: Upload, title: "Upload Privately", desc: "Upload video directly to private object storage.", detail: ["Multipart upload up to 10 GB", "Streaming SHA-256 in the browser", "Server verifies size, media type, and duration"] },
  { num: "03", icon: CreditCard, title: "Lock the Cost", desc: "The app calculates credits from verified duration and tier.", detail: ["Basic: 2 credits per source second", "Plus: 6 credits per source second", "Premium: 13 credits per source second"] },
  { num: "04", icon: Play, title: "Render Durably", desc: "A persistent worker submits an idempotent render attempt.", detail: ["Automatic exponential retries", "Progress and heartbeats stored in PostgreSQL", "Credits remain reserved while work is active"] },
  { num: "05", icon: CheckCircle, title: "Review the Draft", desc: "Approve the verified output or request a revision.", detail: ["The output is checked in R2 before success", "Only successful work consumes credits", "Exhausted failures create human-review alerts"] },
  { num: "06", icon: Download, title: "Download Securely", desc: "Download through a short-lived authenticated link.", detail: ["No permanent signed URLs are stored", "Raw uploads are deleted after 1 day", "Final renders are deleted after 3 days"] },
];

export default function HowItWorksPage() {
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24"><div className="text-center mb-16"><h1 className="text-5xl font-black mb-4">How It Works</h1><p className="text-muted-foreground text-lg">From private upload to a verified video delivery.</p></div><div className="space-y-8">{STEPS.map(({ num, icon: Icon, title, desc, detail }) => <div key={num} className="glass border border-white/5 rounded-2xl p-8 flex gap-6"><div className="w-14 h-14 flex-shrink-0 gold-gradient rounded-2xl flex items-center justify-center text-black font-black text-lg">{num}</div><div className="flex-1"><div className="flex items-center gap-3 mb-3"><Icon className="w-5 h-5 text-gold-400" /><h2 className="text-xl font-bold">{title}</h2></div><p className="text-muted-foreground mb-4">{desc}</p><ul className="space-y-1.5">{detail.map((item) => <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{item}</li>)}</ul></div></div>)}</div></div>;
}
