import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireOrderAccess } from "@/lib/api/authz";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
  const { orderId } = await params;
  const { notes } = await req.json();
  const { order } = await requireOrderAccess(orderId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DRAFT_REVIEW") return NextResponse.json({ error: "No draft ready" }, { status: 400 });
  if (order.revisionCount >= order.maxRevisions) {
    return NextResponse.json({ error: "Revision limit reached" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.revision.create({
      data: {
        orderId,
        revisionNumber: order.revisionCount + 1,
        customerNotes: notes,
        status: "requested",
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "REVISION_REQUESTED", revisionCount: { increment: 1 }, manualReviewRequired: true },
    }),
  ]);

  // Notify n8n
  if (process.env.N8N_BASE_URL) {
    await fetch(`${process.env.N8N_BASE_URL}/webhook/order-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET || "" },
      body: JSON.stringify({ event: "revision_requested", orderId, notes }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
