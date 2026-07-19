import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { R2Keys } from "@/lib/storage/r2";
import { objectExists } from "@/lib/storage/r2";
import { FINAL_RENDER_RETENTION_MS } from "@/lib/storage/retention";
import { verifySharedSecret } from "@/lib/api/shared-secret";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (!verifySharedSecret(secret, process.env.N8N_WEBHOOK_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  const r2Key = R2Keys.final(orderId);
  if (!(await objectExists(r2Key))) return NextResponse.json({ error: "Output object does not exist" }, { status: 409 });
  const expiresAt = new Date(Date.now() + FINAL_RENDER_RETENTION_MS);

  await prisma.deliveryLink.create({
    data: { orderId, r2Key, expiresAt },
  });

  await prisma.invoice.updateMany({
    where: { orderId },
    data: { deliveryStatus: "delivered" },
  });

  return NextResponse.json({ ok: true });
}
