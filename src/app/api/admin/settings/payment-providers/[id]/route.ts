import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requireAdmin } from "@/lib/api/authz";
import { PAYMENT_PROVIDER_DEFINITIONS, paymentProviderReadiness } from "@/lib/payment/providers";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  enabled: z.boolean().optional(),
  checkoutUrl: z.union([z.string().url(), z.literal("")]).optional(),
}).refine((value) => value.enabled !== undefined || value.checkoutUrl !== undefined, "No changes supplied");

function configObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = Schema.parse(await request.json());
    const existing = await prisma.paymentProvider.findUnique({ where: { id } });
    const definition = PAYMENT_PROVIDER_DEFINITIONS.find((provider) => provider.id === id || provider.name === existing?.name);
    if (!definition) throw new ApiError(404, "Payment provider not found");
    if (input.checkoutUrl !== undefined && definition.name !== "payoneer") throw new ApiError(400, "Only Payoneer uses an editable hosted payment URL");
    const existingConfig = configObject(existing?.config);
    const checkoutUrl = input.checkoutUrl ?? (typeof existingConfig.checkoutUrl === "string" ? existingConfig.checkoutUrl : "");
    const enabled = input.enabled ?? existing?.enabled ?? definition.defaultEnabled;
    const readiness = paymentProviderReadiness(definition.name, { checkoutUrl });
    if (enabled && !readiness.configured) throw new ApiError(409, readiness.detail);
    const config = { ...existingConfig, supports: definition.supports, ...(definition.name === "payoneer" ? { checkoutUrl } : {}) };

    const provider = existing
      ? await prisma.paymentProvider.update({ where: { id: existing.id }, data: { enabled, config } })
      : await prisma.paymentProvider.upsert({
          where: { name: definition.name },
          update: { enabled, config },
          create: { id: definition.id, name: definition.name, enabled, mode: definition.mode, regions: definition.regions, config },
        });
    await prisma.auditEvent.create({
      data: { actorId: admin.id, action: "PAYMENT_PROVIDER_UPDATED", targetType: "PaymentProvider", targetId: provider.id, metadata: { provider: definition.name, enabled, checkoutUrlChanged: input.checkoutUrl !== undefined } },
    });
    return NextResponse.json({ id: provider.id, enabled: provider.enabled, checkoutUrl, configured: readiness.configured, detail: readiness.detail });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid gateway setting" }, { status: 400 });
    return apiError(error);
  }
}
