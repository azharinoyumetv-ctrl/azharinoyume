import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { probeVideo } from "@/lib/media/verify";
import { prisma } from "@/lib/prisma";
import { completeMultipartUpload, headR2Object } from "@/lib/storage/r2";

const Schema = z.object({ parts: z.array(z.object({ partNumber: z.number().int().positive(), etag: z.string().min(1) })).min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = Schema.parse(await request.json());
    const session = await prisma.uploadSession.findFirst({ where: { assetId: id, userId: user.id }, include: { asset: true } });
    if (!session) throw new ApiError(404, "Upload session not found");
    if (input.parts.length !== session.expectedParts || new Set(input.parts.map((p) => p.partNumber)).size !== session.expectedParts) throw new ApiError(400, "Every upload part must be supplied exactly once");
    await completeMultipartUpload(session.asset.r2Key, session.providerUploadId, input.parts);
    const head = await headR2Object(session.asset.r2Key);
    if (Number(head.ContentLength) !== Number(session.totalSizeBytes)) throw new ApiError(409, "Uploaded object size does not match the declared file size");
    await prisma.$transaction(async (tx) => {
      await tx.uploadPart.createMany({ data: input.parts.map((part) => ({ sessionId: session.id, partNumber: part.partNumber, etag: part.etag })) });
      await tx.uploadSession.update({ where: { id: session.id }, data: { status: "UPLOADED" } });
      await tx.uploadedAsset.update({ where: { id }, data: { status: "UPLOADED" } });
    });
    try {
      const probe = await probeVideo(session.asset.r2Key);
      const asset = await prisma.uploadedAsset.update({ where: { id }, data: { status: "VERIFIED", durationMs: probe.durationMs, verifiedAt: new Date() } });
      await prisma.uploadSession.update({ where: { id: session.id }, data: { status: "VERIFIED" } });
      return NextResponse.json({ assetId: asset.id, status: asset.status, durationMs: asset.durationMs });
    } catch (probeError) {
      await prisma.uploadedAsset.update({ where: { id }, data: { status: "REJECTED" } });
      await prisma.uploadSession.update({ where: { id: session.id }, data: { status: "REJECTED" } });
      throw new ApiError(422, probeError instanceof Error ? probeError.message : "Media verification failed");
    }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid completion request", issues: error.issues }, { status: 400 });
    return apiError(error);
  }
}
