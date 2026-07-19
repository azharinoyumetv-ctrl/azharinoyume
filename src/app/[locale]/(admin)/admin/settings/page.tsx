import { getPaymentProviderSettings } from "@/lib/payment/providers";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [fx, products, flags, gateways] = await Promise.all([
    prisma.fxRate.findUnique({ where: { id: "USD_IDR" } }),
    prisma.pricingProduct.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
    getPaymentProviderSettings(),
  ]);
  return <SettingsClient
    fx={fx ? { rate: Number(fx.rate), version: fx.version, effectiveAt: fx.effectiveAt.toISOString() } : null}
    products={products.map((item) => ({ key: item.key, name: item.name, usdCents: item.usdCents, credits: item.credits, kind: item.kind }))}
    flags={flags.map((item) => ({ key: item.key, enabled: item.enabled, description: item.description }))}
    gateways={gateways.map((gateway) => ({ id: gateway.id, name: gateway.name, label: gateway.label, description: gateway.description, mode: gateway.mode, supports: gateway.supports, enabled: gateway.enabled, configured: gateway.configured, detail: gateway.detail, checkoutUrl: gateway.checkoutUrl }))}
  />;
}
