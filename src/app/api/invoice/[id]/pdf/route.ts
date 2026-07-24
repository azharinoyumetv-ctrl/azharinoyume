import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoiceHtml } from "@/lib/invoice/generate";
import { renderInvoicePdf } from "@/lib/origin/client";
import { r2, BUCKET } from "@/lib/storage/r2";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      order: { select: { customerEmail: true, customerName: true, orderNumber: true, package: true } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Customers can only access their own invoices
  if (session.user.role !== "admin" && invoice.order?.customerEmail !== session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const r2Key = `invoices/${invoice.id}/invoice-${invoice.invoiceNumber}.pdf`;

  // Try serving cached PDF from R2 first
  try {
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: BUCKET, Key: r2Key }),
      { expiresIn: 3600 }
    );
    return NextResponse.redirect(signedUrl);
  } catch {
    // PDF not cached — generate it
  }

  // Normalise Decimal → number for buildInvoiceHtml
  const invoiceData = {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    total: Number(invoice.total),
    paidAmount: invoice.paidAmount != null ? Number(invoice.paidAmount) : null,
    items: invoice.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      total: Number(i.total),
    })),
  };

  let pdfBuffer: Uint8Array;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = buildInvoiceHtml(invoiceData as any);
    pdfBuffer = await renderInvoicePdf(html);
  } catch (err) {
    console.error("[invoice-pdf] Puppeteer failed:", err);
    // Fallback: serve HTML
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = buildInvoiceHtml(invoiceData as any);
    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  }

  // Cache in R2
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    })
  );

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
