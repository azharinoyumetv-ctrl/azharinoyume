import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { apiError, ApiError, requireUser } from "@/lib/api/authz";
import { prisma } from "@/lib/prisma";
import {
  evaluateProductionBrief,
  ProductionBriefInputSchema,
} from "@/lib/production/brief";
import { PROJECT_TIERS } from "@/lib/production/catalog";
import { requireProductionReadiness } from "@/lib/production/readiness";
import { generateInvoiceNumber, generateOrderNumber } from "@/lib/utils";
import { Editor360ConfigSchema } from "@/lib/video360/contracts";

const Schema = ProductionBriefInputSchema.extend({
  editingMode: z.enum(["standard", "360"]).default("standard"),
  editorConfig: Editor360ConfigSchema.optional(),
}).superRefine((value, context) => {
  if (value.editingMode === "360" && !value.editorConfig) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["editorConfig"],
      message: "360 editor settings are required",
    });
  }
  if (value.editingMode === "standard" && value.editorConfig) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["editorConfig"],
      message: "360 editor settings require 360 editing mode",
    });
  }
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = Schema.parse(await request.json());
    requireProductionReadiness(input.editingMode);
    const key = request.headers.get("idempotency-key");
    if (!key || key.length < 12)
      throw new ApiError(400, "A valid Idempotency-Key header is required");

    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing) {
      if (existing.userId !== user.id)
        throw new ApiError(409, "Idempotency key is already in use");
      return NextResponse.json(existing);
    }

    const assessment = evaluateProductionBrief(input);
    if (!assessment.readyForProduction) {
      return NextResponse.json(
        {
          error: "The production brief contains unresolved conflicts",
          ambiguityScore: assessment.ambiguityScore,
          issues: assessment.issues,
        },
        { status: 409 },
      );
    }

    const tier = PROJECT_TIERS[input.tier];
    const now = new Date();

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: user.id,
        customerEmail: user.email,
        customerName: user.name,
        package: input.tier,
        status: "AWAITING_PAYMENT",
        purpose: input.purpose,
        audience: input.audience,
        visualStyle: input.visualStyle,
        mood: input.mood,
        editingPace: input.editingPace,
        colorGrade: input.colorGrade,
        captionStyle: input.captionStyle,
        musicStyle: input.musicStyle,
        storyPriority: input.storyPriority,
        mandatoryContent: input.mandatoryContent,
        excludedContent: input.excludedContent,
        creativeFreedom: input.creativeFreedom,
        targetDurationSeconds: input.targetDurationSeconds,
        briefStatus: "confirmed",
        briefAmbiguityScore: assessment.ambiguityScore,
        briefConfirmedAt: now,
        platform: input.platform,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        frameRate: input.frameRate,
        exportFormat: input.exportFormat,
        compression: input.compression,
        editingMode: input.editingMode,
        editorConfig: input.editorConfig,
        customerPromptOriginal: input.prompt,
        totalPrice: tier.priceUsd,
        currency: "USD",
        maxRevisions: tier.revisions,
        idempotencyKey: key,
        editBriefs: {
          create: {
            version: 1,
            status: "approved",
            ambiguityScore: assessment.ambiguityScore,
            issues: assessment.issues as unknown as Prisma.InputJsonValue,
            approvedAt: now,
            promptOriginal: input.prompt,
            structuredBrief:
              assessment.structuredBrief as unknown as Prisma.InputJsonValue,
          },
        },
        invoices: {
          create: {
            invoiceNumber: generateInvoiceNumber(),
            userId: user.id,
            status: "pending_payment",
            subtotal: tier.priceUsd,
            total: tier.priceUsd,
            currency: "USD",
            items: {
              create: {
                description: `${tier.name} automated video production`,
                quantity: 1,
                unitPrice: tier.priceUsd,
                total: tier.priceUsd,
              },
            },
          },
        },
      },
      include: {
        invoices: true,
        editBriefs: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid production brief", issues: error.issues },
        { status: 400 },
      );
    return apiError(error);
  }
}
