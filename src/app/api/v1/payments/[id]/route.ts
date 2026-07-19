import { NextRequest, NextResponse } from "next/server";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payment = await prisma.payment.findFirst({ where: { id, userId: user.id }, select: { id: true, provider: true, status: true, usdCents: true, idrAmount: true, currency: true, paidAt: true, expiresAt: true, createdAt: true, metadata: true } });
    if (!payment) throw new ApiError(404, "Payment not found");
    return NextResponse.json(payment);
  } catch (error) { return apiError(error); }
}
