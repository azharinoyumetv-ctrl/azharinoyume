import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  const assets = await prisma.uploadedAsset.findMany({ where: { orderId } });

  const hasFiles = assets.length > 0 && (
    assets.some((a) => a.r2Key && a.r2Key.length > 0) ||
    assets.some((a) => a.cloudUrl && a.cloudUrl.length > 0)
  );

  if (!hasFiles) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "failed" } });
    return NextResponse.json({ valid: false, error: "No uploaded files found" });
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "upload_received" } });
  return NextResponse.json({ valid: true, assetCount: assets.length });
}
