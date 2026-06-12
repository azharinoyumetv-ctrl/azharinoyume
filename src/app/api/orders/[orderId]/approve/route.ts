import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "draft_ready") return NextResponse.json({ error: "No draft ready" }, { status: 400 });

  await prisma.order.update({
    where: { id: params.orderId },
    data: { status: "final_rendering" },
  });

  // Notify n8n to start final render
  await triggerN8n("final_render", { orderId: params.orderId });

  return NextResponse.json({ ok: true });
}

async function triggerN8n(event: string, data: object) {
  if (!process.env.N8N_BASE_URL) return;
  try {
    await fetch(`${process.env.N8N_BASE_URL}/webhook/order-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify({ event, ...data }),
    });
  } catch {}
}
