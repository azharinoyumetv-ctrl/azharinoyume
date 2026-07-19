import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STAGES = ["new", "scored", "drafting", "ready", "submitted", "won", "lost"];

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { stage } = await req.json();
  if (!VALID_STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  await prisma.jobLead.update({
    where: { id: params.id },
    data: { pipelineStatus: stage },
  });

  return NextResponse.json({ ok: true });
}
