const BASE_URL = "https://api.xendit.co";
const API_VERSION = "2024-11-11";
export const XENDIT_PACK_CHANNELS = ["QRIS", "OVO", "DANA", "SHOPEEPAY", "LINKAJA"] as const;

type PaymentRequest = {
  reference_id: string;
  type: "PAY" | "PAY_AND_SAVE";
  country: "ID";
  currency: "IDR";
  request_amount: number;
  capture_method: "AUTOMATIC";
  channel_code: string;
  channel_properties?: Record<string, unknown>;
  payment_token_id?: string;
  description?: string;
  metadata?: Record<string, string>;
};

type XenditAction = { descriptor?: string; value?: unknown };
type XenditResponse = {
  message?: unknown;
  actions?: XenditAction[];
  payment_request_id?: unknown;
  id?: unknown;
};

type XenditWebhookPayload = {
  payment_request_id?: unknown;
  id?: unknown;
  reference_id?: unknown;
  status?: unknown;
  request_amount?: unknown;
  amount?: unknown;
  paid_amount?: unknown;
  capture_amount?: unknown;
  currency?: unknown;
  payment_token_id?: unknown;
  network_transaction_id?: unknown;
  payment_details?: { network_transaction_id?: unknown };
  created?: unknown;
  updated?: unknown;
};

type XenditWebhookEnvelope = XenditWebhookPayload & {
  event_id?: unknown;
  event?: unknown;
  created?: unknown;
  updated?: unknown;
  data?: XenditWebhookPayload;
};

export function parseXenditWebhook(body: XenditWebhookEnvelope) {
  const payload = body.data && typeof body.data === "object" ? body.data : body;
  const amountValue = payload.request_amount ?? payload.amount ?? payload.paid_amount ?? payload.capture_amount;
  const amount = typeof amountValue === "number" || typeof amountValue === "string" ? Number(amountValue) : Number.NaN;

  return {
    payload,
    eventId: typeof body.event_id === "string" ? body.event_id : null,
    eventType: String(body.event || payload.status || "UNKNOWN"),
    referenceId: typeof payload.reference_id === "string" ? payload.reference_id : null,
    providerPaymentId:
      typeof payload.payment_request_id === "string"
        ? payload.payment_request_id
        : typeof payload.id === "string" && payload.id.startsWith("pr-")
          ? payload.id
          : null,
    status: String(payload.status || "").toUpperCase(),
    amount,
    currency: String(payload.currency || "IDR").toUpperCase(),
    paymentTokenId: typeof payload.payment_token_id === "string" ? payload.payment_token_id : undefined,
    networkTransactionId:
      typeof payload.network_transaction_id === "string"
        ? payload.network_transaction_id
        : typeof payload.payment_details?.network_transaction_id === "string"
          ? payload.payment_details.network_transaction_id
          : undefined,
    updated: String(payload.updated || body.updated || body.created || ""),
  };
}

async function createPaymentRequest(payload: PaymentRequest, idempotencyKey: string) {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new Error("Xendit is not configured");
  const response = await fetch(`${BASE_URL}/v3/payment_requests`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "api-version": API_VERSION,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json() as XenditResponse;
  if (!response.ok) throw new Error(`Xendit ${response.status}: ${data.message || "payment request failed"}`);
  return data;
}

function action(data: XenditResponse) {
  const actions = Array.isArray(data.actions) ? data.actions : [];
  const qr = actions.find((item) => item?.descriptor === "QR_STRING")?.value;
  const url = actions.find((item) => item?.descriptor === "WEB_URL")?.value;
  if (qr) return { type: "QR" as const, qrString: String(qr) };
  if (url) return { type: "REDIRECT" as const, url: String(url) };
  return { type: "NONE" as const };
}

export async function createXenditPackPayment(input: { referenceId: string; amount: number; channel: string; idempotencyKey: string }) {
  if (!XENDIT_PACK_CHANNELS.includes(input.channel as typeof XENDIT_PACK_CHANNELS[number])) throw new Error("Unsupported Xendit channel");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const channelProperties = input.channel === "QRIS"
    ? { expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") }
    : { success_return_url: `${appUrl}/portal?payment=success`, failure_return_url: `${appUrl}/portal?payment=failed` };
  const data = await createPaymentRequest({
    reference_id: input.referenceId,
    type: "PAY",
    country: "ID",
    currency: "IDR",
    request_amount: input.amount,
    capture_method: "AUTOMATIC",
    channel_code: input.channel,
    channel_properties: channelProperties,
  }, input.idempotencyKey);
  return { providerPaymentId: String(data.payment_request_id || data.id), action: action(data) };
}

export async function createXenditRecurringPayment(input: { referenceId: string; amount: number; paymentTokenId: string; idempotencyKey: string; initial: boolean }) {
  const data = await createPaymentRequest({
    reference_id: input.referenceId,
    type: input.initial ? "PAY_AND_SAVE" : "PAY",
    country: "ID",
    currency: "IDR",
    request_amount: input.amount,
    capture_method: "AUTOMATIC",
    channel_code: "CARDS",
    payment_token_id: input.paymentTokenId,
    channel_properties: { card_on_file_type: "RECURRING", transaction_sequence: input.initial ? "FIRST" : "SUBSEQUENT", skip_three_ds: !input.initial },
    description: "Azyume Cut AI 30-day subscription",
  }, input.idempotencyKey);
  return { providerPaymentId: String(data.payment_request_id || data.id), action: action(data) };
}
