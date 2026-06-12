import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

// Called by the Remotion render service when a job completes or fails
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-render-secret");
  if (secret !== process.env.RENDER_SERVICE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId: orderId, status, r2Key, error } = await req.json();

  if (status === "failed") {
    const render = await prisma.render.findFirst({
      where: { orderId, status: "processing" },
      orderBy: { id: "desc" },
    });
    if (render) {
      await prisma.render.update({
        where: { id: render.id },
        data: { status: "failed", errorLog: error || "Render service error" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (status === "completed" && r2Key) {
    const render = await prisma.render.findFirst({
      where: { orderId, status: "processing" },
      orderBy: { id: "desc" },
    });
    if (render) {
      await prisma.render.update({
        where: { id: render.id },
        data: { status: "completed", completedAt: new Date(), outputR2Key: r2Key },
      });
    }

    // Create or refresh delivery link (48h)
    const signedUrl = await getSignedDownloadUrl(r2Key, 48 * 3600);
    const existing = await prisma.deliveryLink.findFirst({ where: { orderId } });
    if (existing) {
      await prisma.deliveryLink.update({
        where: { id: existing.id },
        data: { signedUrl, r2Key, expiresAt: new Date(Date.now() + 48 * 3600 * 1000) },
      });
    } else {
      await prisma.deliveryLink.create({
        data: { orderId, signedUrl, r2Key, expiresAt: new Date(Date.now() + 48 * 3600 * 1000) },
      });
    }

    await prisma.order.update({ where: { id: orderId }, data: { status: "draft_review" } });
  }

  return NextResponse.json({ ok: true });
}
