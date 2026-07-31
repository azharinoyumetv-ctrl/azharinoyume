import { ApiError } from "@/lib/api/authz";
import { midtransCredentialReadiness } from "@/lib/payment/midtrans";
import { prisma } from "@/lib/prisma";

export type PaymentGateway = "doku" | "xendit" | "midtrans" | "payoneer";

type ProviderDefinition = {
  id: string;
  name: PaymentGateway;
  label: string;
  description: string;
  mode: "auto" | "manual";
  regions: string[];
  supports: Array<"PACK" | "SUBSCRIPTION" | "PROJECT">;
  defaultEnabled: boolean;
};

export const PAYMENT_PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "doku",
    label: "DOKU",
    description: "Indonesian Checkout for one-time credit packs.",
    mode: "auto",
    regions: ["ID"],
    supports: ["PACK", "PROJECT"],
    defaultEnabled: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "xendit",
    label: "Xendit v3",
    description: "QRIS and e-wallet packs, plus token-ready recurring cards.",
    mode: "auto",
    regions: ["ID"],
    supports: ["PACK", "SUBSCRIPTION", "PROJECT"],
    defaultEnabled: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "midtrans",
    label: "Midtrans Snap",
    description: "Indonesian cards, QRIS, bank transfer, and e-wallet checkout.",
    mode: "auto",
    regions: ["ID"],
    supports: ["PACK", "PROJECT"],
    defaultEnabled: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "payoneer",
    label: "Payoneer",
    description: "Hosted payment link with administrator reconciliation.",
    mode: "manual",
    regions: ["GLOBAL"],
    supports: ["PACK", "PROJECT"],
    defaultEnabled: false,
  },
];

export function isPaymentGateway(value: string): value is PaymentGateway {
  return PAYMENT_PROVIDER_DEFINITIONS.some((provider) => provider.name === value);
}

function configObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function paymentProviderReadiness(name: PaymentGateway, options?: { checkoutUrl?: string }) {
  if (name === "doku") {
    const configured = Boolean(process.env.DOKU_CLIENT_ID && process.env.DOKU_SHARED_KEY);
    return { configured, detail: configured ? "Credentials configured" : "DOKU_CLIENT_ID or DOKU_SHARED_KEY is missing" };
  }
  if (name === "xendit") {
    const configured = Boolean(process.env.XENDIT_SECRET_KEY && process.env.XENDIT_WEBHOOK_SECRET);
    return { configured, detail: configured ? "API and webhook configured" : "Xendit API or webhook configuration is incomplete" };
  }
  if (name === "midtrans") {
    return midtransCredentialReadiness();
  }
  let configured = false;
  try {
    const url = new URL(options?.checkoutUrl || process.env.PAYONEER_PAYMENT_URL || "");
    configured = url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:");
  } catch {
    configured = false;
  }
  return { configured, detail: configured ? "Hosted payment link configured" : "Hosted payment URL is missing or invalid" };
}

export async function getPaymentProviderSettings() {
  const rows = await prisma.paymentProvider.findMany({
    where: { name: { in: PAYMENT_PROVIDER_DEFINITIONS.map((provider) => provider.name) } },
  });
  return PAYMENT_PROVIDER_DEFINITIONS.map((definition) => {
    const row = rows.find((candidate) => candidate.name === definition.name);
    const config = configObject(row?.config);
    const checkoutUrl = definition.name === "payoneer" && typeof config.checkoutUrl === "string" ? config.checkoutUrl : "";
    return {
      ...definition,
      id: row?.id || definition.id,
      enabled: row?.enabled ?? definition.defaultEnabled,
      mode: (row?.mode === "manual" ? "manual" : definition.mode) as "auto" | "manual",
      checkoutUrl,
      ...paymentProviderReadiness(definition.name, { checkoutUrl }),
    };
  });
}

export async function requirePaymentProvider(name: PaymentGateway, productKind: string) {
  const provider = (await getPaymentProviderSettings()).find((item) => item.name === name);
  if (!provider || !provider.enabled) throw new ApiError(409, `${provider?.label || name} is disabled in payment settings`);
  if (!provider.configured) throw new ApiError(503, `${provider.label} is enabled but not configured`);
  if (!provider.supports.includes(productKind as "PACK" | "SUBSCRIPTION" | "PROJECT")) throw new ApiError(400, `${provider.label} does not support this product`);
  return provider;
}
