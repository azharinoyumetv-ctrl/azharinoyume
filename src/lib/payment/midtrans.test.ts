import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMidtransPayment,
  parseMidtransWebhook,
  verifyMidtransWebhook,
} from "@/lib/payment/midtrans";

const originalEnvironment = {
  clientKey: process.env.MIDTRANS_Client_Key,
  merchantId: process.env.MIDTRANS_Merchant_ID,
  serverKey: process.env.MIDTRANS_Server_Key,
  mode: process.env.MIDTRANS_ENVIRONMENT,
};

function configure() {
  process.env.MIDTRANS_Client_Key = "SB-Mid-client-test";
  process.env.MIDTRANS_Merchant_ID = "G123456789";
  process.env.MIDTRANS_Server_Key = "SB-Mid-server-test";
  process.env.MIDTRANS_ENVIRONMENT = "sandbox";
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries({
    MIDTRANS_Client_Key: originalEnvironment.clientKey,
    MIDTRANS_Merchant_ID: originalEnvironment.merchantId,
    MIDTRANS_Server_Key: originalEnvironment.serverKey,
    MIDTRANS_ENVIRONMENT: originalEnvironment.mode,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Midtrans Snap", () => {
  it("creates a sandbox redirect checkout", async () => {
    configure();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        token: "snap-token-1",
        redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-1",
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const result = await createMidtransPayment({
      referenceId: "AZY-order-1",
      amount: 149_000,
      customer: { name: "Azyume Customer", email: "customer@example.test" },
    });

    expect(result).toEqual({
      providerPaymentId: "snap-token-1",
      action: {
        type: "REDIRECT",
        url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-1",
      },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("SB-Mid-server-test:").toString("base64")}`,
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      transaction_details: { order_id: "AZY-order-1", gross_amount: 149_000 },
      credit_card: { secure: true },
    });
  });

  it("verifies and parses a signed payment notification", () => {
    configure();
    const payload = {
      order_id: "AZY-order-1",
      status_code: "200",
      gross_amount: "149000.00",
      transaction_status: "settlement",
      transaction_id: "transaction-1",
      merchant_id: "G123456789",
      currency: "IDR",
      signature_key: crypto
        .createHash("sha512")
        .update("AZY-order-1" + "200" + "149000.00" + "SB-Mid-server-test")
        .digest("hex"),
    };

    expect(verifyMidtransWebhook(payload)).toBe(true);
    expect(parseMidtransWebhook(payload)).toMatchObject({
      referenceId: "AZY-order-1",
      transactionId: "transaction-1",
      status: "SETTLEMENT",
      amount: 149_000,
      currency: "IDR",
    });
  });

  it("rejects an invalid notification signature", () => {
    configure();
    expect(verifyMidtransWebhook({
      order_id: "AZY-order-1",
      status_code: "200",
      gross_amount: "149000.00",
      transaction_status: "settlement",
      merchant_id: "G123456789",
      signature_key: "invalid",
    })).toBe(false);
  });
});
