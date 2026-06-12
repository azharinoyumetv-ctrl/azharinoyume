import { CheckCircle, Upload, CreditCard, Play, Download } from "lucide-react";

const STEPS = [
  {
    num: "01", icon: CreditCard, title: "Choose a Package",
    desc: "Select Basic ($49), Plus ($149), or Premium ($399). One-time payment. No subscriptions.",
    detail: ["Pick the right size for your project", "Choose your style, mood, platform, and resolution", "Add optional extras like rush processing or 4K"],
  },
  {
    num: "02", icon: Upload, title: "Upload Your Footage",
    desc: "Upload directly or share a cloud link (Google Drive, Dropbox, WeTransfer).",
    detail: ["Raw footage up to 10, 30, or 90 minutes depending on package", "Our AI generates an editing prompt from your selections", "Edit and refine the prompt before placing your order"],
  },
  {
    num: "03", icon: CreditCard, title: "Pay — Processing Starts",
    desc: "Payment is confirmed first. Your video is never processed before payment.",
    detail: ["Xendit (SEA/Indonesia), Payoneer (global), Wise (bank transfer)", "Payment confirmed in seconds for Xendit/Payoneer", "Wise bank transfer requires manual verification (1–4 hours)"],
  },
  {
    num: "04", icon: Play, title: "AI Edits Your Video",
    desc: "Our AI engine processes your footage based on your brief. Track progress live.",
    detail: ["Translation → edit brief → FFmpeg processing → captions → render", "Real queue position and ETA shown on your status page", "Auto-refresh every 30 seconds"],
  },
  {
    num: "05", icon: CheckCircle, title: "Review Your Draft",
    desc: "You receive a draft video link. Approve it or request changes.",
    detail: ["Basic: 1 revision, Plus: 2 revisions, Premium: 3 revisions", "Draft link is active for 48 hours", "Extra revisions available as add-on ($15)"],
  },
  {
    num: "06", icon: Download, title: "Download Final Video",
    desc: "Final video is delivered via secure download link (valid 7 days).",
    detail: ["Download in MP4, MOV, or custom format", "Delivery link sent by email immediately", "Invoice PDF attached to your order account"],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">How It Works</h1>
        <p className="text-muted-foreground text-lg">Six simple steps from raw footage to finished video.</p>
      </div>

      <div className="space-y-8">
        {STEPS.map(({ num, icon: Icon, title, desc, detail }) => (
          <div key={num} className="glass border border-white/5 rounded-2xl p-8 flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 gold-gradient rounded-2xl flex items-center justify-center text-black font-black text-lg">
                {num}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Icon className="w-5 h-5 text-gold-400" />
                <h2 className="text-xl font-bold">{title}</h2>
              </div>
              <p className="text-muted-foreground mb-4">{desc}</p>
              <ul className="space-y-1.5">
                {detail.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
