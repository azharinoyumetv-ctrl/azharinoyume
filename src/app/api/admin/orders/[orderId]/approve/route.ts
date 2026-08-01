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
    include: { renders: { orderBy: { startedAt: "desc" }, take: 1 } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const draftReady = order.renders[0]?.status === "SUCCEEDED";
  await prisma.$transaction([
    prisma.order.update({
      where: { id: params.orderId },
      data: {
        adminApproved: true,
        ...(order.status === "PRODUCTION_REVIEW_REQUIRED" && draftReady
          ? { status: "DRAFT_REVIEW" }
          : {}),
      },
    }),
    prisma.reviewTask.updateMany({
      where: { orderId: params.orderId, status: "OPEN" },
      data: { status: "RESOLVED", resolution: "Approved by operator", resolvedAt: new Date() },
    }),
    prisma.adminAction.create({
      data: { adminId: session.user.id, action: "approve_order", targetType: "order", targetId: params.orderId },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
