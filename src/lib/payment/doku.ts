import crypto from "crypto";
import { timingSafeEqual } from "@/lib/security/crypto";

const TARGET = "/checkout/v1/payment";

type DokuCheckoutResponse = {
  error_messages?: string[];
  message?: unknown;
  payment?: { url?: string; token?: unknown };
  response?: { payment?: { payment_url?: string }; uuid?: unknown };
  payment_url?: string;
  uuid?: unknown;
};

function credentials() {
  const clientId = process.env.DOKU_CLIENT_ID || process.env.DOKU_PRODUCTION_CLIENT_ID || process.env.DOKU_SANDBOX_CLIENT_ID || "";
  const sharedKey = process.env.DOKU_SHARED_KEY || process.env.DOKU_PRODUCTION_SHARED_KEY || process.env.DOKU_SANDBOX_SHARED_KEY || "";
  if (!clientId || !sharedKey) throw new Error("DOKU is not configured");
  return { clientId, sharedKey };
}

function signature(clientId: string, requestId: string, timestamp: string, target: string, digest: string, key: string) {
  const canonical = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${target}\nDigest:${digest}`;
  return `HMACSHA256=${crypto.createHmac("sha256", key).update(canonical).digest("base64")}`;
}

export async function createDokuCheckout(input: { referenceId: string; amount: number; customer: { name?: string | null; email: string } }) {
  const { clientId, sharedKey } = credentials();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const body = {
    order: {
      amount: Math.round(input.amount),
      invoice_number: input.referenceId,
      currency: "IDR",
      callback_url: `${appUrl}/api/webhooks/doku`,
      callback_url_result: `${appUrl}/portal?payment=${encodeURIComponent(input.referenceId)}`,
      auto_redirect: false,
    },
    payment: {
      payment_due_date: 60,
      payment_method_types: [
        "VIRTUAL_ACCOUNT_BCA", "VIRTUAL_ACCOUNT_BANK_MANDIRI", "VIRTUAL_ACCOUNT_BRI", "VIRTUAL_ACCOUNT_BNI",
        "VIRTUAL_ACCOUNT_BANK_PERMATA", "EMONEY_SHOPEEPAY", "EMONEY_OVO", "EMONEY_DANA", "ONLINE_TO_OFFLINE_ALFA",
      ],
    },
    customer: { name: input.customer.name || "Azyume customer", email: input.customer.email },
  };
  const raw = JSON.stringify(body);
  const digest = crypto.createHash("sha256").update(raw).digest("base64");
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const base = process.env.DOKU_ENVIRONMENT === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com";
  const response = await fetch(`${base}${TARGET}`, {
    method: "POST",
    headers: {
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature(clientId, requestId, timestamp, TARGET, digest, sharedKey),
      "Content-Type": "application/json",
    },
    body: raw,
  });
  const data = await response.json() as DokuCheckoutResponse;
  if (!response.ok) throw new Error((data.error_messages as string[] | undefined)?.join(", ") || String(data.message || `DOKU ${response.status}`));
  const url = data.payment?.url || data.response?.payment?.payment_url || data.payment_url;
  if (!url) throw new Error("DOKU did not return a checkout URL");
  return { providerPaymentId: String(data.payment?.token || data.response?.uuid || data.uuid || input.referenceId), action: { type: "REDIRECT" as const, url } };
}

export function verifyDokuWebhook(rawBody: string, headers: Headers, pathname: string) {
  const { clientId, sharedKey } = credentials();
  const incomingClientId = headers.get("client-id") || "";
  const requestId = headers.get("request-id") || "";
  const timestamp = headers.get("request-timestamp") || "";
  const incoming = headers.get("signature") || "";
  if (!incomingClientId || !requestId || !timestamp || !incoming || !timingSafeEqual(incomingClientId, clientId)) return false;
  const parsedTime = Date.parse(timestamp);
  if (!Number.isFinite(parsedTime) || Math.abs(Date.now() - parsedTime) > 5 * 60 * 1000) return false;
  const digest = crypto.createHash("sha256").update(rawBody).digest("base64");
  return timingSafeEqual(signature(clientId, requestId, timestamp, pathname, digest, sharedKey), incoming);
}
