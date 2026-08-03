import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireOrderAccess } from "@/lib/api/authz";
import { z } from "zod";

const RevisionSchema = z.object({ notes: z.string().trim().min(10).max(3_000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
  const { orderId } = await params;
  const { notes } = RevisionSchema.parse(await req.json());
  const { order } = await requireOrderAccess(orderId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DRAFT_REVIEW") return NextResponse.json({ error: "No draft ready" }, { status: 400 });
  if (order.revisionCount >= order.maxRevisions) {
    return NextResponse.json({ error: "Revision limit reached" }, { status: 400 });
  }

  const revisionNumber = order.revisionCount + 1;
  await prisma.$transaction([
    prisma.revision.create({
      data: {
        orderId,
        revisionNumber,
        customerNotes: notes,
        status: "requested",
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "ANALYSIS_QUEUED",
        revisionCount: { increment: 1 },
        manualReviewRequired: true,
        adminApproved: false,
        customerPromptOriginal: `${order.customerPromptOriginal || ""}\n\nConfirmed revision ${revisionNumber}: ${notes}`.trim(),
      },
    }),
    prisma.queueJob.create({
      data: {
        orderId,
        jobType: "MEDIA_ANALYSIS",
        status: "pending",
        priority: order.package === "premium" ? 20 : order.package === "plus" ? 10 : 0,
      },
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

  return NextResponse.json({ ok: true, status: "ANALYSIS_QUEUED", revisionNumber });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Revision notes must be between 10 and 3,000 characters" }, { status: 400 });
    return apiError(error);
  }
}
