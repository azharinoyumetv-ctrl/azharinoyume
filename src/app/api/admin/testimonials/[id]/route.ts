import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { action } = await req.json();
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const testimonial = await prisma.testimonial.findUnique({ where: { id: params.id } });
  if (!testimonial) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Privacy guard — never publish without at least one consent field
  if (action === "approve" && !testimonial.consentShowVideo && !testimonial.consentShowPrompt) {
    return NextResponse.json({ error: "Cannot approve without customer consent" }, { status: 422 });
  }

  await prisma.testimonial.update({
    where: { id: params.id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      ...(action === "approve" ? { published: false } : {}), // admin publishes separately
    },
  });

  const adminUser = await prisma.user.findFirst({ where: { email: session.user.email! } });

  await prisma.adminAction.create({
    data: {
      adminId: adminUser?.id || "unknown",
      action: `testimonial_${action}`,
      targetType: "testimonial",
      targetId: params.id,
      notes: `${action}d by ${session.user.email}`,
    },
  });

  return NextResponse.json({ ok: true });
}
