import { NextRequest, NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import { getSignedPartUrl } from "@/lib/storage/r2";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; partNumber: string }> }) {
  try {
    const user = await requireUser();
    const { id, partNumber: rawPart } = await params;
    const partNumber = Number(rawPart);
    const session = await prisma.uploadSession.findFirst({ where: { assetId: id, userId: user.id }, include: { asset: true } });
    if (!session) throw new ApiError(404, "Upload session not found");
    if (session.status !== "CREATED" || session.expiresAt <= new Date()) throw new ApiError(409, "Upload session is not active");
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > session.expectedParts) throw new ApiError(400, "Invalid part number");
    return NextResponse.json({ partNumber, url: await getSignedPartUrl(session.asset.r2Key, session.providerUploadId, partNumber, 15 * 60), expiresInSeconds: 900 });
  } catch (error) { return apiError(error); }
}
