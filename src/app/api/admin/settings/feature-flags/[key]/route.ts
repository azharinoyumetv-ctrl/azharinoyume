import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
const Schema = z.object({ enabled: z.boolean() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ key: string }> }) { try { const admin = await requireAdmin(); const { key } = await params; const { enabled } = Schema.parse(await request.json()); const flag = await prisma.featureFlag.update({ where: { key }, data: { enabled } }); await prisma.auditEvent.create({ data: { actorId: admin.id, action: "FEATURE_FLAG_UPDATED", targetType: "FeatureFlag", targetId: key, metadata: { enabled } } }); return NextResponse.json(flag); } catch (error) { return apiError(error); } }
