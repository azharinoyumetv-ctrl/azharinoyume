import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import { createMultipartUpload, R2Keys } from "@/lib/storage/r2";
import { RAW_UPLOAD_RETENTION_MS } from "@/lib/storage/retention";

const MAX_BYTES = 10 * 1024 * 1024 * 1024;
const PART_SIZE = 20 * 1024 * 1024;
const Schema = z.object({ orderId: z.string().uuid(), fileName: z.string().min(1).max(255), sizeBytes: z.number().int().positive().max(MAX_BYTES), mimeType: z.string().regex(/^video\//), checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i) });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = Schema.parse(await request.json());
    const order = await prisma.order.findFirst({ where: { id: input.orderId, userId: user.id } });
    if (!order) throw new ApiError(404, "Order not found");
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = R2Keys.rawUpload(user.id, order.id, `${crypto.randomUUID()}-${safeName}`);
    const providerUploadId = await createMultipartUpload(key, input.mimeType);
    const expectedParts = Math.ceil(input.sizeBytes / PART_SIZE);
    const asset = await prisma.uploadedAsset.create({ data: { orderId: order.id, userId: user.id, r2Key: key, fileName: input.fileName, fileSizeBytes: BigInt(input.sizeBytes), mimeType: input.mimeType, assetType: "raw_footage", status: "UPLOADING", checksumSha256: input.checksumSha256, expiresAt: new Date(Date.now() + RAW_UPLOAD_RETENTION_MS), uploadSession: { create: { userId: user.id, orderId: order.id, providerUploadId, partSizeBytes: PART_SIZE, totalSizeBytes: BigInt(input.sizeBytes), expectedParts, expiresAt: new Date(Date.now() + 24 * 3600_000) } } } });
    return NextResponse.json({ assetId: asset.id, uploadId: asset.id, partSizeBytes: PART_SIZE, expectedParts, expiresAt: new Date(Date.now() + 24 * 3600_000) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid upload request", issues: error.issues }, { status: 400 });
    return apiError(error);
  }
}
