import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `ORDER-${year}-${random}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `INV-${year}-${random}`;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

export function getCostCap(pkg: string): number {
  const caps: Record<string, number> = {
    basic: parseFloat(process.env.COST_CAP_BASIC || "3.00"),
    plus: parseFloat(process.env.COST_CAP_PLUS || "9.00"),
    premium: parseFloat(process.env.COST_CAP_PREMIUM || "26.00"),
  };
  return caps[pkg] ?? 9.80;
}

export function getPackagePrice(pkg: string): number {
  const prices: Record<string, number> = { basic: 14.99, plus: 44.99, premium: 129.99 };
  return prices[pkg] ?? 14.99;
}

export function getMaxRevisions(pkg: string): number {
  const revisions: Record<string, number> = { basic: 1, plus: 2, premium: 3 };
  return revisions[pkg] ?? 1;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
}

export function etaLabel(queueAheadCount: number, pkg: string): string {
  const baseMins: Record<string, number> = { basic: 20, plus: 45, premium: 90 };
  const base = baseMins[pkg] ?? 30;
  const totalMins = queueAheadCount * base + base;
  if (totalMins <= 45) return "20–45 minutes";
  if (totalMins <= 180) return "1–3 hours";
  if (totalMins <= 480) return "3–8 hours";
  if (totalMins <= 1440) return "12–24 hours";
  return "1–2 business days";
}
