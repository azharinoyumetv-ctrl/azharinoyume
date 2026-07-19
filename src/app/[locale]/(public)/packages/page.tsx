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
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
    <div className="text-center mb-14"><h1 className="text-5xl font-black mb-4">Credits that match your workload</h1><p className="text-muted-foreground text-lg">Basic 2 credits/sec · Plus 6 credits/sec · Premium 13 credits/sec</p></div>
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Coins className="text-gold-400"/> One-time credit packs</h2>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">{PACKS.map((pack) => <div key={pack.name} className="glass rounded-2xl border border-white/10 p-6"><div className="text-3xl font-black">{pack.price}</div><div className="font-semibold mt-2">{pack.name}</div><div className="text-sm text-muted-foreground mt-1">{pack.note}; never expires</div></div>)}</div>
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Repeat2 className="text-gold-400"/> 30-day plans</h2>
    <div className="grid md:grid-cols-3 gap-6 mb-12">{PLANS.map((plan) => <div key={plan.name} className={`glass rounded-2xl border p-8 ${plan.popular ? "border-gold-500/50 glow-gold" : "border-white/10"}`}><div className="text-sm uppercase tracking-widest text-muted-foreground">{plan.name}</div><div className="text-4xl font-black mt-2">{plan.price}<span className="text-sm text-muted-foreground"> / 30 days</span></div><div className="mt-6 flex items-center gap-2"><Check className="w-4 text-green-400"/> {plan.credits}</div><div className="mt-2 flex items-center gap-2"><Check className="w-4 text-green-400"/> Credits remain valid for 60 days</div></div>)}</div>
    <div className="text-center"><Link href="/portal/billing" className="inline-flex px-7 py-4 gold-gradient text-black font-bold rounded-xl">Open wallet and checkout</Link><p className="text-xs text-muted-foreground mt-4">Catalog prices are USD. Enabled gateways use the same locked IDR quote for 15 minutes.</p></div>
  </div>;
}
