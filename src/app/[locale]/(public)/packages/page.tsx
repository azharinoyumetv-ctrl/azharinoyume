import Link from "next/link";
import { Check, Coins, Repeat2 } from "lucide-react";

const PACKS = [
  { name: "1,000 Credits", price: "$10", note: "Permanent" },
  { name: "3,000 Credits", price: "$25", note: "Permanent" },
  { name: "6,200 Credits", price: "$50", note: "Permanent" },
  { name: "13,000 Credits", price: "$100", note: "Permanent" },
];
const PLANS = [
  { name: "Starter", price: "$9.99", credits: "1,200 credits" },
  { name: "Creator", price: "$24.99", credits: "3,700 credits", popular: true },
  { name: "Studio", price: "$69.99", credits: "10,000 credits" },
];

export default function PackagesPage() {
  return <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
    <div className="mb-10 text-center sm:mb-14"><h1 className="mb-4 text-4xl font-black sm:text-5xl">Credits that match your workload</h1><p className="text-base text-muted-foreground sm:text-lg">Basic 2 credits/sec · Plus 6 credits/sec · Premium 13 credits/sec</p></div>
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Coins className="text-gold-400"/> One-time credit packs</h2>
    <div className="mb-12 grid grid-cols-2 gap-3 sm:mb-16 sm:gap-4 lg:grid-cols-4">{PACKS.map((pack) => <div key={pack.name} className="glass rounded-2xl border border-white/10 p-4 sm:p-6"><div className="text-2xl font-black sm:text-3xl">{pack.price}</div><div className="mt-2 font-semibold">{pack.name}</div><div className="mt-1 text-sm text-muted-foreground">{pack.note}; never expires</div></div>)}</div>
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Repeat2 className="text-gold-400"/> 30-day plans</h2>
    <div className="mb-12 grid gap-5 md:grid-cols-3 md:gap-6">{PLANS.map((plan) => <div key={plan.name} className={`glass rounded-2xl border p-5 sm:p-8 ${plan.popular ? "border-gold-500/50 glow-gold" : "border-white/10"}`}><div className="text-sm uppercase tracking-widest text-muted-foreground">{plan.name}</div><div className="mt-2 text-3xl font-black sm:text-4xl">{plan.price}<span className="text-sm text-muted-foreground"> / 30 days</span></div><div className="mt-6 flex items-center gap-2"><Check className="w-4 text-green-400"/> {plan.credits}</div><div className="mt-2 flex items-center gap-2"><Check className="w-4 text-green-400"/> Credits remain valid for 60 days</div></div>)}</div>
    <div className="text-center"><Link href="/portal/billing" className="gold-gradient inline-flex min-h-14 w-full items-center justify-center rounded-xl px-7 font-bold text-black sm:w-auto">Open wallet and checkout</Link><p className="mt-4 text-xs text-muted-foreground">Catalog prices are USD. Enabled gateways use the same locked IDR quote for 15 minutes.</p></div>
  </div>;
}
