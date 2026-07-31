import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { runOpportunityDiscovery } from "@/lib/opportunities/engine";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const admin = await requireAdmin();
    const result = await runOpportunityDiscovery({ force: true });
    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "OPPORTUNITY_DISCOVERY_RUN",
        targetType: "OpportunityEngine",
        targetId: "approved-connectors",
        metadata: result,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
