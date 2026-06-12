import { Resend } from "resend";

// Lazy init so build-time module evaluation doesn't throw without env vars
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  return _resend;
}
const FROM = process.env.EMAIL_FROM || "noreply@azharinoyume.cloud";

export async function sendOrderConfirmationEmail(to: string, data: {
  orderNumber: string;
  package: string;
  total: string;
  currency: string;
  statusUrl: string;
  invoicePdfUrl?: string;
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Order Confirmed — ${data.orderNumber}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#0a0a0f;color:#fff;">
  <h1 style="color:#d4a017;font-size:24px;margin:0 0 8px;">Payment Confirmed ✓</h1>
  <p style="color:#aaa;margin:0 0 24px;">Your AI video editing order is confirmed and processing will begin shortly.</p>
  <div style="background:#16161f;border-radius:12px;padding:20px;margin-bottom:24px;">
    <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Order</div>
    <div style="font-size:20px;font-weight:700;color:#fff;margin:4px 0;">${data.orderNumber}</div>
    <div style="color:#aaa;font-size:14px;">${data.package.toUpperCase()} Package — ${data.total} ${data.currency}</div>
  </div>
  <a href="${data.statusUrl}" style="display:inline-block;background:#d4a017;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:24px;">Track Your Order →</a>
  ${data.invoicePdfUrl ? `<p style="font-size:13px;color:#aaa;"><a href="${data.invoicePdfUrl}" style="color:#d4a017;">Download Invoice PDF</a></p>` : ""}
  <p style="font-size:12px;color:#666;">Questions? Reply to this email or contact support@azharinoyume.cloud</p>
</div>`,
  });
}

export async function sendDraftReadyEmail(to: string, data: {
  orderNumber: string;
  draftUrl: string;
  expiresHours: number;
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your Draft Video is Ready — ${data.orderNumber}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#0a0a0f;color:#fff;">
  <h1 style="color:#d4a017;font-size:24px;margin:0 0 8px;">Your Draft is Ready 🎬</h1>
  <p style="color:#aaa;margin:0 0 24px;">We've finished your draft video for order <strong>${data.orderNumber}</strong>. Please review it and let us know if you'd like any changes.</p>
  <a href="${data.draftUrl}" style="display:inline-block;background:#d4a017;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:24px;">Watch Draft & Give Feedback →</a>
  <p style="font-size:13px;color:#666;">Draft link expires in ${data.expiresHours} hours.</p>
</div>`,
  });
}

export async function sendFinalDeliveryEmail(to: string, data: {
  orderNumber: string;
  downloadUrl: string;
  expiryDays: number;
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Final Video Delivered — ${data.orderNumber}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#0a0a0f;color:#fff;">
  <h1 style="color:#d4a017;font-size:24px;margin:0 0 8px;">Final Video Delivered 🎉</h1>
  <p style="color:#aaa;margin:0 0 24px;">Your final video for order <strong>${data.orderNumber}</strong> is ready for download.</p>
  <a href="${data.downloadUrl}" style="display:inline-block;background:#d4a017;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:24px;">Download Final Video →</a>
  <p style="font-size:13px;color:#666;">Link expires in ${data.expiryDays} days. Please download and save your file.</p>
</div>`,
  });
}

export async function sendWisePaymentInstructionsEmail(to: string, data: {
  orderNumber: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  reference: string;
  invoicePdfUrl?: string;
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Payment Instructions — ${data.invoiceNumber}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#0a0a0f;color:#fff;">
  <h1 style="color:#d4a017;font-size:24px;margin:0 0 8px;">Complete Your Payment</h1>
  <p style="color:#aaa;margin:0 0 24px;">Please transfer <strong>${data.amount} ${data.currency}</strong> via bank transfer and include the exact reference below.</p>
  <div style="background:#fffbeb;color:#92400e;border-radius:12px;padding:20px;margin-bottom:24px;">
    <div style="font-size:12px;font-weight:600;margin-bottom:8px;">PAYMENT REFERENCE (REQUIRED):</div>
    <div style="font-family:monospace;font-size:20px;font-weight:800;background:#fff;padding:8px 16px;border-radius:4px;display:inline-block;">${data.reference}</div>
    <p style="font-size:12px;margin:12px 0 0;">Your order will not be processed until payment is received with this exact reference.</p>
  </div>
  ${data.invoicePdfUrl ? `<a href="${data.invoicePdfUrl}" style="color:#d4a017;font-size:13px;">View Full Invoice with Bank Details →</a>` : ""}
</div>`,
  });
}

export async function sendTestimonialRequestEmail(to: string, data: {
  orderNumber: string;
  reviewUrl: string;
}) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `How was your experience? — ${data.orderNumber}`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#0a0a0f;color:#fff;">
  <h1 style="color:#d4a017;font-size:24px;margin:0 0 8px;">We'd love your feedback</h1>
  <p style="color:#aaa;margin:0 0 24px;">Thank you for using Azyume Cut AI for order <strong>${data.orderNumber}</strong>. If you're happy with the result, we'd love to share it with others (with your permission).</p>
  <a href="${data.reviewUrl}" style="display:inline-block;background:#d4a017;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Leave a Review →</a>
  <p style="font-size:12px;color:#666;margin-top:24px;">This is completely optional. You control what gets shared.</p>
</div>`,
  });
}
