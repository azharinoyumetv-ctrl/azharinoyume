import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireAdmin } from "@/lib/api/authz";
import {
  connectorTypeIsSupported,
  testSourceConnector,
} from "@/lib/opportunities/engine";
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
    const connector = await prisma.sourceConnector.findUnique({ where: { id } });
    if (!connector) throw new ApiError(404, "Source connector not found");
    if (!connectorTypeIsSupported(connector.connectorType))
      throw new ApiError(409, "This source has no production connector adapter");
    if (connector.policyStatus !== "approved")
      throw new ApiError(409, "This source is not approved for automated collection");

    if (input.enabled) await testSourceConnector(connector.id);
    const updated = await prisma.sourceConnector.update({
      where: { id: connector.id },
      data: {
        enabled: input.enabled,
        health: input.enabled ? "healthy" : "disabled",
      },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: input.enabled ? "SOURCE_CONNECTOR_ENABLED" : "SOURCE_CONNECTOR_DISABLED",
        targetType: "SourceConnector",
        targetId: connector.id,
        metadata: { connector: connector.name, connectorType: connector.connectorType },
      },
    });
    return NextResponse.json({
      id: updated.id,
      enabled: updated.enabled,
      health: updated.health,
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid connector setting" }, { status: 400 });
    return apiError(error);
  }
}
