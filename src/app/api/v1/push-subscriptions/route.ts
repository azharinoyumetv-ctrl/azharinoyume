import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ endpoint: z.string().url(), expirationTime: z.number().nullable().optional(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = Schema.parse(await request.json());
    const subscription = await prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, create: { userId: user.id, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, expiresAt: input.expirationTime ? new Date(input.expirationTime) : null }, update: { userId: user.id, p256dh: input.keys.p256dh, auth: input.keys.auth, expiresAt: input.expirationTime ? new Date(input.expirationTime) : null } });
    return NextResponse.json({ id: subscription.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const endpoint = new URL(request.url).searchParams.get("endpoint");
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
