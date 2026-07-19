import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
const Schema = z.object({ rate: z.number().min(1000).max(100000) });
export async function PATCH(request: NextRequest) { try { const admin = await requireAdmin(); const { rate } = Schema.parse(await request.json()); const fx = await prisma.fxRate.upsert({ where: { id: "USD_IDR" }, create: { id: "USD_IDR", baseCurrency: "USD", quoteCurrency: "IDR", rate, effectiveAt: new Date(), updatedBy: admin.id }, update: { rate, effectiveAt: new Date(), version: { increment: 1 }, updatedBy: admin.id } }); await prisma.auditEvent.create({ data: { actorId: admin.id, action: "FX_RATE_UPDATED", targetType: "FxRate", targetId: fx.id, metadata: { rate } } }); return NextResponse.json(fx); } catch (error) { return apiError(error); } }
