import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const wallet = await prisma.wallet.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {}, include: { entries: { orderBy: { createdAt: "desc" }, take: 50 }, lots: { where: { status: "ACTIVE", remainingCredits: { gt: 0 } }, orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }] } } });
    return NextResponse.json(wallet);
  } catch (error) { return apiError(error); }
}
