import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { renders: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, include: { qualityCheck: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const latest = order.renders[0];
  if (!latest) return NextResponse.json({ error: "No successful output is ready for approval" }, { status: 409 });
  const groupPrefix = latest.idempotencyKey ? `${latest.idempotencyKey.split(":").slice(0, -1).join(":")}:` : null;
  const group = groupPrefix ? order.renders.filter((render) => render.idempotencyKey?.startsWith(groupPrefix)) : [latest];
  if (group.some((render) => !render.qualityCheck))
    return NextResponse.json({ error: "QA is incomplete for one or more output variants" }, { status: 409 });
  const approvedStatus = latest.renderType === "final" ? "DELIVERED" : "DRAFT_REVIEW";
  await prisma.$transaction([
    prisma.order.update({
      where: { id: params.orderId },
      data: {
        adminApproved: true,
        ...(order.status === "PRODUCTION_REVIEW_REQUIRED"
          ? { status: approvedStatus }
          : {}),
      },
    }),
    prisma.reviewTask.updateMany({
      where: { orderId: params.orderId, status: "OPEN" },
      data: { status: "RESOLVED", resolution: "Approved by operator", resolvedAt: new Date() },
    }),
    ...(approvedStatus === "DELIVERED" ? [prisma.invoice.updateMany({ where: { orderId: params.orderId }, data: { deliveryStatus: "delivered" } })] : []),
    prisma.adminAction.create({
      data: { adminId: session.user.id, action: "approve_order", targetType: "order", targetId: params.orderId },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
