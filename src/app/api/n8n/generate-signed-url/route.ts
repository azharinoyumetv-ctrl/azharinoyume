import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl, R2Keys } from "@/lib/storage/r2";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, fileType, expiresSeconds = 3600 } = await req.json();

  const r2Key = fileType === "final"
    ? R2Keys.final(orderId)
    : R2Keys.draft(orderId, 1);

  const signedUrl = await getSignedDownloadUrl(r2Key, expiresSeconds);
  const expiresAt = new Date(Date.now() + expiresSeconds * 1000);

  await prisma.r2File.create({
    data: { orderId, r2Key, fileType, signedUrl, signedUrlExpires: expiresAt },
  });

  return NextResponse.json({ ok: true, signedUrl, expiresAt });
}
