import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderStatusClient from "./OrderStatusClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPaymentProviderSettings } from "@/lib/payment/providers";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage(props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/order/${params.orderId}`);
  const [order, paymentProviders] = await Promise.all([prisma.order.findFirst({
    where: { id: params.orderId, ...(session.user.role === "admin" ? {} : { userId: session.user.id }) },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      deliveryLinks: { orderBy: { createdAt: "desc" } },
      renders: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "desc" } },
      revisions: { orderBy: { revisionNumber: "asc" } },
    },
  }), getPaymentProviderSettings()]);

  if (!order) notFound();

  const gateways = paymentProviders
    .filter((provider) => provider.enabled && provider.configured && provider.supports.includes("PROJECT"))
    .map(({ name, label, mode }) => ({ name, label, mode }));

  return <OrderStatusClient order={JSON.parse(JSON.stringify(order))} gateways={gateways} />;
}
