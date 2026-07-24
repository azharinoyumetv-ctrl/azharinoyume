import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { apiError, requireAdmin } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  pricing: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  faq: z.array(z.record(z.string(), z.unknown())).optional(),
  status: z.enum(["DRAFT", "READY", "SUBMITTED", "ARCHIVED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = Schema.parse(await request.json());
    const data: Prisma.GigDraftUpdateInput = {
      ...input,
      pricing: input.pricing as Prisma.InputJsonValue | undefined,
      faq: input.faq as Prisma.InputJsonValue | undefined,
      submittedAt: input.status === "SUBMITTED" ? new Date() : undefined,
    };
    return NextResponse.json(
      await prisma.gigDraft.update({ where: { id }, data }),
    );
  } catch (error) {
    return apiError(error);
  }
}
