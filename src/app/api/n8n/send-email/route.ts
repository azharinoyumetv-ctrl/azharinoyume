import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendOrderConfirmationEmail,
  sendDraftReadyEmail,
  sendFinalDeliveryEmail,
  sendTestimonialRequestEmail,
} from "@/lib/email/send";
import { formatCurrency } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, type, signedUrl } = await req.json();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { invoices: { take: 1, orderBy: { createdAt: "desc" } } },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://azharinoyume.cloud";

  switch (type) {
    case "order_confirmed":
    case "editing_started":
      await sendOrderConfirmationEmail(order.customerEmail, {
        orderNumber: order.orderNumber,
        package: order.package,
        total: formatCurrency(Number(order.totalPrice)),
        currency: order.currency,
        statusUrl: `${appUrl}/order/${order.id}`,
      });
      break;

    case "draft_ready":
      if (signedUrl) {
        await sendDraftReadyEmail(order.customerEmail, {
          orderNumber: order.orderNumber,
          draftUrl: signedUrl,
          expiresHours: 48,
        });
      }
      break;

    case "final_delivered":
      if (signedUrl) {
        await sendFinalDeliveryEmail(order.customerEmail, {
          orderNumber: order.orderNumber,
          downloadUrl: signedUrl,
          expiryDays: 7,
        });
      }
      break;

    case "testimonial_request":
      await sendTestimonialRequestEmail(order.customerEmail, {
        orderNumber: order.orderNumber,
        reviewUrl: `${appUrl}/review/${order.id}`,
      });
      break;
  }

  return NextResponse.json({ ok: true });
}
