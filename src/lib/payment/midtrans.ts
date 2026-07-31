import crypto from "crypto";
import { timingSafeEqual } from "@/lib/security/crypto";

type MidtransTransactionResponse = {
  token?: unknown;
  redirect_url?: unknown;
  error_messages?: unknown;
  status_message?: unknown;
};

export type MidtransWebhook = {
  transaction_status?: unknown;
  fraud_status?: unknown;
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_id?: unknown;
  payment_type?: unknown;
  currency?: unknown;
  merchant_id?: unknown;
  transaction_time?: unknown;
  settlement_time?: unknown;
};

function environmentValue(primary: string, fallback: string) {
  return process.env[primary] || process.env[fallback] || "";
}

function credentials() {
  const clientKey = environmentValue("MIDTRANS_Client_Key", "MIDTRANS_CLIENT_KEY");
  const merchantId = environmentValue("MIDTRANS_Merchant_ID", "MIDTRANS_MERCHANT_ID");
  const serverKey = environmentValue("MIDTRANS_Server_Key", "MIDTRANS_SERVER_KEY");
  if (!clientKey || !merchantId || !serverKey) throw new Error("Midtrans is not configured");
  return { clientKey, merchantId, serverKey };
}

function midtransBaseUrl() {
  return process.env.MIDTRANS_ENVIRONMENT === "production"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

export async function createMidtransPayment(input: {
  referenceId: string;
  amount: number;
  customer: { name?: string | null; email: string };
}) {
  const { serverKey } = credentials();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${midtransBaseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.referenceId,
        gross_amount: Math.round(input.amount),
      },
      credit_card: { secure: true },
      customer_details: {
        first_name: input.customer.name || "Azyume customer",
        email: input.customer.email,
      },
      callbacks: {
        finish: `${appUrl}/portal/billing?payment=${encodeURIComponent(input.referenceId)}`,
      },
    }),
  });
  const data = await response.json() as MidtransTransactionResponse;
  if (!response.ok) {
    const messages = Array.isArray(data.error_messages)
      ? data.error_messages.map(String).join(", ")
      : String(data.status_message || `Midtrans ${response.status}`);
    throw new Error(messages);
  }

  if (typeof data.token !== "string" || typeof data.redirect_url !== "string") {
    throw new Error("Midtrans did not return a valid checkout session");
  }

  return {
    providerPaymentId: data.token,
    action: { type: "REDIRECT" as const, url: data.redirect_url },
  };
}

export function parseMidtransWebhook(body: MidtransWebhook) {
  const amount = Number(body.gross_amount);
  return {
    referenceId: typeof body.order_id === "string" ? body.order_id : null,
    transactionId: typeof body.transaction_id === "string" ? body.transaction_id : null,
    status: String(body.transaction_status || "").toUpperCase(),
    fraudStatus: String(body.fraud_status || "").toUpperCase(),
    statusCode: String(body.status_code || ""),
    grossAmount: typeof body.gross_amount === "string" ? body.gross_amount : String(body.gross_amount ?? ""),
    amount,
    currency: String(body.currency || "IDR").toUpperCase(),
    signature: typeof body.signature_key === "string" ? body.signature_key : "",
    merchantId: typeof body.merchant_id === "string" ? body.merchant_id : "",
    paymentType: String(body.payment_type || "UNKNOWN"),
    occurredAt: String(body.settlement_time || body.transaction_time || ""),
  };
}

export function verifyMidtransWebhook(body: MidtransWebhook) {
  const { merchantId, serverKey } = credentials();
  const parsed = parseMidtransWebhook(body);
  if (
    !parsed.referenceId ||
    !parsed.statusCode ||
    !parsed.grossAmount ||
    !parsed.signature ||
    (parsed.merchantId && parsed.merchantId !== merchantId)
  ) {
    return false;
  }

  const expected = crypto
    .createHash("sha512")
    .update(`${parsed.referenceId}${parsed.statusCode}${parsed.grossAmount}${serverKey}`)
    .digest("hex");
  return timingSafeEqual(parsed.signature.toLowerCase(), expected);
}
