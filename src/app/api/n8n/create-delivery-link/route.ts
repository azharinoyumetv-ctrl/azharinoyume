import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { R2Keys } from "@/lib/storage/r2";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, signedUrl } = await req.json();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.deliveryLink.create({
    data: { orderId, r2Key: R2Keys.final(orderId), signedUrl, expiresAt },
  });

  await prisma.invoice.updateMany({
    where: { orderId },
    data: { deliveryStatus: "delivered" },
  });

  return NextResponse.json({ ok: true });
}
