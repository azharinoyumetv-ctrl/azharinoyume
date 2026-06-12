import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { isActive } = await req.json();

  await prisma.paymentProvider.update({
    where: { id: params.id },
    data: { enabled: Boolean(isActive) },
  });

  const adminUser = await prisma.user.findFirst({ where: { email: session.user.email! } });

  await prisma.adminAction.create({
    data: {
      adminId: adminUser?.id || "unknown",
      action: isActive ? "payment_provider_enabled" : "payment_provider_disabled",
      targetType: "payment_provider",
      targetId: params.id,
      notes: `${isActive ? "Enabled" : "Disabled"} by ${session.user.email}`,
    },
  });

  return NextResponse.json({ ok: true });
}
