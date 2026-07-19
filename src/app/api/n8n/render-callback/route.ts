import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  const supplied = request.headers.get("x-render-secret") || "";
  const expected = process.env.RENDER_SERVICE_SECRET || "";
  if (!expected || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId, status, r2Key, checksum, error, errorCode, progress = 100 } = await request.json();
  const attempt = await prisma.renderAttempt.findUnique({ where: { id: jobId } });
  if (!attempt) return NextResponse.json({ received: true });
  await prisma.renderAttempt.update({ where: { id: jobId }, data: { status, progress, outputR2Key: r2Key, checksum, errorCode, errorMessage: error, heartbeatAt: new Date(), completedAt: ["SUCCEEDED", "FAILED"].includes(status) ? new Date() : null } });
  return NextResponse.json({ received: true });
}
