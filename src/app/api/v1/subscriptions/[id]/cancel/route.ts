import { NextRequest, NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const subscription = await prisma.subscription.findFirst({ where: { id, userId: user.id } });
    if (!subscription) throw new ApiError(404, "Subscription not found");
    return NextResponse.json(await prisma.subscription.update({ where: { id }, data: { cancelAtPeriodEnd: true } }));
  } catch (error) { return apiError(error); }
}
