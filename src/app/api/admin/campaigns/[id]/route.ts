import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireAdmin } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = Schema.parse(await request.json());
    const campaign = await prisma.searchCampaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError(404, "Search campaign not found");
    const updated = await prisma.searchCampaign.update({
      where: { id },
      data: { enabled: input.enabled },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: input.enabled ? "SEARCH_CAMPAIGN_ENABLED" : "SEARCH_CAMPAIGN_DISABLED",
        targetType: "SearchCampaign",
        targetId: id,
        metadata: { campaign: campaign.name },
      },
    });
    return NextResponse.json({ id: updated.id, enabled: updated.enabled });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid campaign setting" }, { status: 400 });
    return apiError(error);
  }
}
