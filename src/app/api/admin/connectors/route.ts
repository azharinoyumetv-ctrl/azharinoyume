import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireAdmin } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

const RssSchema = z.object({
  connectorType: z.literal("rss_feed"),
  name: z.string().trim().min(3).max(100),
  feedUrl: z.string().url().max(2_000),
  attribution: z.string().trim().min(2).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const input = RssSchema.parse(await request.json());
    const url = new URL(input.feedUrl);
    if (url.protocol !== "https:") throw new ApiError(400, "RSS feed must use HTTPS");
    if (url.username || url.password) throw new ApiError(400, "RSS feed URL cannot include credentials");
    const existing = await prisma.sourceConnector.findUnique({ where: { name: input.name } });
    if (existing) throw new ApiError(409, "A connector with this name already exists");

    const connector = await prisma.sourceConnector.create({
      data: {
        name: input.name,
        connectorType: "rss_feed",
        collectionMethod: "published_rss_feed",
        permissionMethod: "published_rss_feed",
        policyStatus: "approved",
        health: "disabled",
        authStatus: "not_required",
        enabled: false,
        allowedActions: ["collect", "score", "draft_proposal", "link_to_source"],
        retentionDays: 90,
        rateLimit: { minimumIntervalMinutes: 60, maximumJobsPerRun: 100 },
        configuration: {
          endpoint: url.toString(),
          attribution: input.attribution,
          sourceKey: `rss_${url.hostname.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
          maximumJobsPerRun: 100,
        },
      },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: "RSS_CONNECTOR_CREATED",
        targetType: "SourceConnector",
        targetId: connector.id,
        metadata: { name: connector.name, hostname: url.hostname },
      },
    });
    return NextResponse.json({ id: connector.id, name: connector.name }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid connector name, HTTPS feed URL, and attribution" }, { status: 400 });
    }
    return apiError(error);
  }
}
