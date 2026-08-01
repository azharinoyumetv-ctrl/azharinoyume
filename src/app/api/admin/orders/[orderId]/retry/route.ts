import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRenderQueue } from "@/lib/queue/queues";

export async function POST(_req: NextRequest, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      timelineManifests: { orderBy: { createdAt: "desc" }, take: 1 },
      renders: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const render = order.renders[0];
  if (order.timelineManifests.length && render) {
    if (["RENDERING", "UPLOADING", "PREPARING"].includes(render.status))
      return NextResponse.json({ error: "The render is already running" }, { status: 409 });
    await prisma.$transaction([
      prisma.render.update({ where: { id: render.id }, data: { status: "QUEUED", progress: 0, errorLog: null, leaseExpiresAt: null } }),
      prisma.order.update({ where: { id: order.id }, data: { status: "QUEUED" } }),
      prisma.adminAction.create({ data: { adminId: session.user.id, action: "retry_render", targetType: "order", targetId: order.id } }),
    ]);
    const queue = getRenderQueue();
    const existing = await queue.getJob(render.id);
    if (existing) await existing.retry();
    else await queue.add("render-video", { orderId: order.id, renderId: render.id, billingMode: "project" }, { jobId: render.id });
  } else {
    await prisma.$transaction([
      prisma.queueJob.create({ data: { orderId: order.id, jobType: "MEDIA_ANALYSIS", status: "pending", priority: order.package === "premium" ? 20 : order.package === "plus" ? 10 : 0 } }),
      prisma.order.update({ where: { id: order.id }, data: { status: "ANALYSIS_QUEUED" } }),
      prisma.adminAction.create({ data: { adminId: session.user.id, action: "retry_analysis", targetType: "order", targetId: order.id } }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
