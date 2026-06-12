import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  const providers = await prisma.paymentProvider.findMany({ orderBy: { name: "asc" } });

  // Current package prices from env (editable via .env on VPS)
  const prices = {
    basic: Number(process.env.PRICE_BASIC || 79),
    plus: Number(process.env.PRICE_PLUS || 149),
    premium: Number(process.env.PRICE_PREMIUM || 299),
    enterprise: Number(process.env.PRICE_ENTERPRISE || 599),
  };

  return <SettingsClient providers={JSON.parse(JSON.stringify(providers))} prices={prices} />;
}
