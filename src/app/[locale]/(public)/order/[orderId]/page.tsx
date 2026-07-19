import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderStatusClient from "./OrderStatusClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage(props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/order/${params.orderId}`);
  const order = await prisma.order.findFirst({
    where: { id: params.orderId, ...(session.user.role === "admin" ? {} : { userId: session.user.id }) },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      deliveryLinks: { orderBy: { createdAt: "desc" }, take: 1 },
      renders: { orderBy: { id: "desc" }, take: 1 },
      revisions: { orderBy: { revisionNumber: "asc" } },
    },
  });

  if (!order) notFound();

  return <OrderStatusClient order={JSON.parse(JSON.stringify(order))} />;
}
