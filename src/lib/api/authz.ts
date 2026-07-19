import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ApiError(401, "Authentication required");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "Administrator access required");
  return user;
}

export async function requireOrderAccess(orderId: string) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (user.role !== "admin" && order.userId !== user.id) throw new ApiError(404, "Order not found");
  return { user, order };
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
