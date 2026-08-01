import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const RegistrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

function clientAddress(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === "bot.azharinoyume.cloud") {
    return NextResponse.json(
      { error: "Customer registration is available on Azyume Studio." },
      { status: 403 },
    );
  }

  if (await consumeRateLimit({
    scope: "registration",
    identifier: clientAddress(request),
    limit: 5,
    windowSeconds: 15 * 60,
  })) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please wait and try again." },
      { status: 429 },
    );
  }

  const parsed = RegistrationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Check your name, email, and password.",
      },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: "customer",
        },
        select: { id: true, name: true, email: true },
      });
      await transaction.wallet.create({ data: { userId: created.id } });
      return created;
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account already exists for this email. Sign in instead." },
        { status: 409 },
      );
    }
    console.error("[registration] Account creation failed", error);
    return NextResponse.json(
      { error: "Account creation failed. Please try again." },
      { status: 500 },
    );
  }
}
