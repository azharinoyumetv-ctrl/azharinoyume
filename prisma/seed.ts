import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const products = [
  { key: "project-basic", kind: "PROJECT", name: "Basic automated project", usdCents: 1499, credits: 0, active: true, sortOrder: 1 },
  { key: "project-plus", kind: "PROJECT", name: "Plus creator production", usdCents: 4499, credits: 0, active: true, sortOrder: 2 },
  { key: "project-premium", kind: "PROJECT", name: "Premium commercial production", usdCents: 12999, credits: 0, active: true, sortOrder: 3 },
  { key: "pack-1000", kind: "PACK", name: "1,000 Credits", usdCents: 1000, credits: 1000, active: false, sortOrder: 10 },
  { key: "pack-3000", kind: "PACK", name: "3,000 Credits", usdCents: 2500, credits: 3000, active: false, sortOrder: 20 },
  { key: "pack-6200", kind: "PACK", name: "6,200 Credits", usdCents: 5000, credits: 6200, active: false, sortOrder: 30 },
  { key: "pack-13000", kind: "PACK", name: "13,000 Credits", usdCents: 10000, credits: 13000, active: false, sortOrder: 40 },
  { key: "starter-monthly", kind: "SUBSCRIPTION", name: "Starter", usdCents: 999, credits: 1200, intervalDays: 30, active: false, sortOrder: 50 },
  { key: "creator-monthly", kind: "SUBSCRIPTION", name: "Creator", usdCents: 2499, credits: 3700, intervalDays: 30, active: false, sortOrder: 60 },
  { key: "studio-monthly", kind: "SUBSCRIPTION", name: "Studio", usdCents: 6999, credits: 10000, intervalDays: 30, active: false, sortOrder: 70 },
] as const;

const paymentProviders = [
  { id: "00000000-0000-4000-8000-000000000001", name: "doku", enabled: true, mode: "auto", regions: ["ID"], config: { supports: ["PROJECT"] } },
  { id: "00000000-0000-4000-8000-000000000002", name: "xendit", enabled: true, mode: "auto", regions: ["ID"], config: { supports: ["PROJECT"] } },
  { id: "00000000-0000-4000-8000-000000000003", name: "payoneer", enabled: false, mode: "manual", regions: ["GLOBAL"], config: { supports: ["PROJECT"] } },
  { id: "00000000-0000-4000-8000-000000000004", name: "midtrans", enabled: true, mode: "auto", regions: ["ID"], config: { supports: ["PROJECT"] } },
] as const;

async function main() {
for (const product of products) {
  await prisma.pricingProduct.upsert({ where: { key: product.key }, update: product, create: product });
}

for (const provider of paymentProviders) {
  await prisma.paymentProvider.upsert({
    where: { name: provider.name },
    update: { mode: provider.mode, regions: provider.regions, config: provider.config },
    create: provider,
  });
}

await prisma.fxRate.upsert({
  where: { id: "USD_IDR" },
  update: {},
  create: {
    id: "USD_IDR",
    baseCurrency: "USD",
    quoteCurrency: "IDR",
    rate: "16250",
    effectiveAt: new Date(),
  },
});

await prisma.featureFlag.upsert({
  where: { key: "r_and_d_360_video" },
  update: {},
  create: { key: "r_and_d_360_video", enabled: false, description: "Research-only 360 video processing" },
});
}

main().finally(() => prisma.$disconnect());
