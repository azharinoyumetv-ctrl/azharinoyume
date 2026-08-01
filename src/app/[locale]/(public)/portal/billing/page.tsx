import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPaymentProviderSettings } from "@/lib/payment/providers";
import { prisma } from "@/lib/prisma";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/portal/billing");
  const [wallet, products, subscriptions, payments, gatewaySettings] = await Promise.all([
    prisma.wallet.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} }),
    prisma.pricingProduct.findMany({ where: { active: true, kind: "PACK" }, orderBy: { sortOrder: "asc" } }),
    prisma.subscription.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    getPaymentProviderSettings(),
  ]);
  const gateways = gatewaySettings.filter((gateway) => gateway.enabled && gateway.configured);
  return <BillingClient initialWallet={wallet.availableCredits} products={products.map((product) => ({ key: product.key, kind: product.kind, name: product.name, usdCents: product.usdCents, credits: product.credits }))} gateways={gateways.map((gateway) => ({ name: gateway.name, label: gateway.label, supports: gateway.supports, mode: gateway.mode }))} subscriptions={subscriptions.map((item) => ({ id: item.id, productKey: item.productKey, status: item.status, nextBillingAt: item.nextBillingAt?.toISOString() || null, cancelAtPeriodEnd: item.cancelAtPeriodEnd }))} payments={payments.map((item) => ({ id: item.id, provider: item.provider, status: item.status, usdCents: item.usdCents, idrAmount: item.idrAmount, currency: item.currency, createdAt: item.createdAt.toISOString() }))} />;
}
