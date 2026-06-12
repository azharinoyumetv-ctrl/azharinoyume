import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();
  const invoice = await prisma.invoice.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  const valid = invoice?.status === "paid" &&
    (!order?.manualReviewRequired || order?.adminApproved === true);

  return NextResponse.json({ valid, invoiceStatus: invoice?.status, adminApproved: order?.adminApproved });
}
