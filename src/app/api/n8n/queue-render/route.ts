import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, renderType } = await req.json();

  // Count active renders ahead of this one for ETA
  const activeAhead = await prisma.render.count({
    where: {
      status: { in: ["queued", "processing"] },
      order: { createdAt: { lt: (await prisma.order.findUnique({ where: { id: orderId }, select: { createdAt: true } }))?.createdAt ?? new Date() } },
    },
  });

  const render = await prisma.render.create({
    data: { orderId, renderType: renderType || "draft", status: "queued" },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: renderType === "final" ? "final_rendering" : "rendering_draft",
      queuePosition: activeAhead,
    },
  });

  await prisma.queueJob.create({
    data: {
      orderId,
      jobType: renderType === "final" ? "render_final" : "render_draft",
      status: "pending",
      priority: 0,
    },
  });

  return NextResponse.json({ ok: true, renderId: render.id, queuePosition: activeAhead });
}
