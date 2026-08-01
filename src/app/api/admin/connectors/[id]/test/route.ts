import { NextResponse } from "next/server";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { testSourceConnector } from "@/lib/opportunities/engine";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const result = await testSourceConnector(id);
    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "SOURCE_CONNECTOR_TESTED",
        targetType: "SourceConnector",
        targetId: id,
        metadata: result,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
