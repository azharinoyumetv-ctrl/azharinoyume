import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROJECT_TIERS, type ProjectTier } from "@/lib/production/catalog";

export async function POST(_req: NextRequest, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      renders: {
        where: { status: "SUCCEEDED", renderType: "final" },
        orderBy: { createdAt: "desc" },
        include: { qualityCheck: true },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const tier = order.package as ProjectTier;
  const latest = order.renders[0];
  const groupPrefix = latest?.idempotencyKey
    ? `${latest.idempotencyKey.split(":").slice(0, -1).join(":")}:`
    : null;
  const latestGroup = latest
    ? groupPrefix
      ? order.renders.filter((render) => render.idempotencyKey?.startsWith(groupPrefix))
      : [latest]
    : [];
  if (!PROJECT_TIERS[tier] || latestGroup.length < PROJECT_TIERS[tier].outputVariants)
    return NextResponse.json({ error: "The complete final output set is not available" }, { status: 409 });
  if (latestGroup.some((render) => !render.qualityCheck || !["passed", "review_required"].includes(render.qualityCheck.status)))
    return NextResponse.json({ error: "Final QA is incomplete" }, { status: 409 });
  await prisma.$transaction([
    prisma.order.update({ where: { id: params.orderId }, data: { status: "DELIVERED" } }),
    prisma.invoice.updateMany({ where: { orderId: params.orderId }, data: { deliveryStatus: "delivered" } }),
    prisma.adminAction.create({
      data: { adminId: session.user.id, action: "mark_delivered", targetType: "order", targetId: params.orderId },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
