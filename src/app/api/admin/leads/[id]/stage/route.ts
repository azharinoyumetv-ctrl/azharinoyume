import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STAGES = ["new", "new_lead", "scored", "drafting", "ready", "submitted", "won", "lost"];

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { stage } = await req.json();
  if (!VALID_STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.jobLead.update({
      where: { id: params.id },
      data: { pipelineStatus: stage },
    });
    if (stage !== "won") return { lead, contractId: null };

    const existingContract = await tx.opportunityContract.findFirst({
      where: { jobLeadId: lead.id },
      select: { id: true },
    });
    if (existingContract) return { lead, contractId: existingContract.id };

    const contract = await tx.opportunityContract.create({
      data: {
        jobLeadId: lead.id,
        title: lead.title,
        source: lead.source,
        productRoutes: lead.productRoute ? [lead.productRoute] : [],
        agreedRevenue: lead.budgetMax || lead.budgetMin,
        currency: lead.currency || "USD",
        status: "intake_required",
        interview: {
          create: {
            status: "not_started",
            ambiguityScore: 100,
            missingAnswers: [
              "Client identity and contacts",
              "Commercial terms",
              "Product-specific deliverables",
              "Required assets",
              "Acceptance criteria",
              "Approval authority",
            ],
          },
        },
      },
    });
    return { lead, contractId: contract.id };
  });

  return NextResponse.json({ ok: true, contractId: result.contractId });
}
