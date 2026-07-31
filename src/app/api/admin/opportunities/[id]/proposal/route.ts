import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { generateOpportunityProposal } from "@/lib/opportunities/engine";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const proposal = await generateOpportunityProposal(id, admin.id);
    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "OPPORTUNITY_PROPOSAL_GENERATED",
        targetType: "JobLead",
        targetId: id,
        metadata: { proposalId: proposal.id },
      },
    });
    return NextResponse.json({ id: proposal.id, status: proposal.status });
  } catch (error) {
    return apiError(error);
  }
}
