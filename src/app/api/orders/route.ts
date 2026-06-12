import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { createInvoiceForOrder } from "@/lib/invoice/generate";
import { getSignedUploadUrl, R2Keys } from "@/lib/storage/r2";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const dataStr = formData.get("data") as string;
    if (!dataStr) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const data = JSON.parse(dataStr);
    const {
      package: pkg, purpose, visualStyle, mood, editingPace, colorGrade,
      captionStyle, musicStyle, platform, aspectRatio, resolution, frameRate,
      exportFormat, compression, cloudLink, customerNotes, generatedPrompt,
      addOns = [], paymentMethod, customerName, customerEmail, customerCompany, total,
    } = data;

    // Validate required fields
    if (!customerEmail || !customerName || !pkg || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orderNumber = generateOrderNumber();
    const maxRevisions = { basic: 1, plus: 2, premium: 3 }[pkg as string] || 1;

    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email: customerEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: customerEmail, name: customerName },
      });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        customerEmail,
        customerName,
        customerCompany: customerCompany || null,
        package: pkg,
        status: "awaiting_payment",
        purpose: purpose || null,
        visualStyle: visualStyle || null,
        mood: mood || null,
        editingPace: editingPace || null,
        colorGrade: colorGrade || null,
        captionStyle: captionStyle || null,
        musicStyle: musicStyle || null,
        platform: platform || null,
        aspectRatio: aspectRatio || null,
        resolution: resolution || "1080p",
        frameRate: frameRate || "30fps standard",
        exportFormat: exportFormat || "MP4 default",
        compression: compression || "Balanced quality",
        customerPromptOriginal: generatedPrompt || customerNotes || null,
        customerPromptLanguage: "en",
        addOns: addOns,
        totalPrice: total,
        currency: "USD",
        maxRevisions,
        manualReviewRequired: paymentMethod === "wise",
      },
    });

    // Build line items
    const PACKAGE_PRICES: Record<string, number> = { basic: 49, plus: 149, premium: 399 };
    const ADDON_PRICES: Record<string, number | string> = {
      extra_30s: 20, extra_60s: 35, extra_revision: 15,
      multi_lang_subs: 20, extra_format: 10, extra_ratio: 15,
      "4k_upgrade": 25, "60fps": 15, thumbnail: 25, voiceover: 25,
    };

    const lineItems = [
      { description: `${pkg.charAt(0).toUpperCase() + pkg.slice(1)} Package`, quantity: 1, unitPrice: PACKAGE_PRICES[pkg] || 49 },
      ...addOns.map((addon: string) => {
        const price = addon === "rush" ? (PACKAGE_PRICES[pkg] || 49) * 0.5 : (ADDON_PRICES[addon] as number || 0);
        const addonNames: Record<string, string> = {
          rush: "Rush Processing (+50%)", extra_30s: "Extra 30s", extra_60s: "Extra 60s",
          extra_revision: "Extra Revision", multi_lang_subs: "Multi-language Subtitles",
          extra_format: "Extra Export Format", extra_ratio: "Extra Aspect Ratio",
          "4k_upgrade": "4K Export Upgrade", "60fps": "60fps Export", thumbnail: "Thumbnail Design",
          voiceover: "AI Voiceover",
        };
        return { description: addonNames[addon] || addon, quantity: 1, unitPrice: price };
      }),
    ];

    // Create invoice
    const invoice = await createInvoiceForOrder(order, lineItems, paymentMethod);

    // Handle file upload — create signed URL for client
    let uploadSignedUrl: string | null = null;
    if (!cloudLink) {
      const fileId = uuidv4();
      const r2Key = R2Keys.rawUpload(user.id, order.id, `raw_${fileId}`);
      uploadSignedUrl = await getSignedUploadUrl(r2Key, "video/*", 7200);

      await prisma.uploadedAsset.create({
        data: {
          orderId: order.id,
          r2Key,
          assetType: "raw_footage",
        },
      });
    } else {
      await prisma.uploadedAsset.create({
        data: {
          orderId: order.id,
          r2Key: "",
          assetType: "cloud_link",
          cloudUrl: cloudLink,
        },
      });
    }

    // Generate checkout URL based on payment method
    let checkoutUrl: string | null = null;
    if (paymentMethod === "xendit") {
      checkoutUrl = await createXenditInvoice(
        { id: invoice.id, total: Number(invoice.total), invoiceNumber: invoice.invoiceNumber },
        { id: order.id, orderNumber: order.orderNumber },
        customerEmail,
        customerName
      );
    } else if (paymentMethod === "payoneer") {
      checkoutUrl = `/order/${order.id}?payment=payoneer&invoice=${invoice.id}`;
    } else if (paymentMethod === "wise") {
      checkoutUrl = null; // wise shows bank details on status page
    }

    return NextResponse.json({
      orderId: order.id,
      invoiceId: invoice.id,
      orderNumber,
      checkoutUrl,
      uploadSignedUrl,
      paymentReference: invoice.paymentReference,
      total,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

async function createXenditInvoice(invoice: { id: string; total: number; invoiceNumber: string }, order: { id: string; orderNumber: string }, email: string, name: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        external_id: order.id,
        amount: Number(invoice.total),
        description: `Azyume Cut AI — ${order.orderNumber}`,
        invoice_duration: 86400,
        customer: { given_names: name, email },
        success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/${order.id}`,
        failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/${order.id}?payment=failed`,
      }),
    });
    const data = await res.json();
    return data.invoice_url || null;
  } catch {
    return null;
  }
}
