import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderStatusClient from "./OrderStatusClient";

export default async function OrderStatusPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
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
