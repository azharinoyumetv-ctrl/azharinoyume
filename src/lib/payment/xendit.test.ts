import { afterEach, describe, expect, it, vi } from "vitest";
import { createXenditPackPayment, parseXenditWebhook } from "@/lib/payment/xendit";

const originalKey = process.env.XENDIT_SECRET_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.XENDIT_SECRET_KEY;
  else process.env.XENDIT_SECRET_KEY = originalKey;
});

describe("Xendit Payment Requests v3", () => {
  it("creates a QRIS payment request and extracts its QR action", async () => {
    process.env.XENDIT_SECRET_KEY = "xnd_development_test";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      payment_request_id: "pr-8877c08a-740d-4153-9816-3d744ed197a5",
      actions: [{ type: "PRESENT_TO_CUSTOMER", descriptor: "QR_STRING", value: "000201010212test" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await createXenditPackPayment({
      referenceId: "AZY-order-1",
      amount: 795000,
      channel: "QRIS",
      idempotencyKey: "payment-order-1",
    });

    expect(result).toEqual({
      providerPaymentId: "pr-8877c08a-740d-4153-9816-3d744ed197a5",
      action: { type: "QR", qrString: "000201010212test" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.xendit.co/v3/payment_requests");
    expect(init?.headers).toMatchObject({
      "api-version": "2024-11-11",
      "Idempotency-Key": "payment-order-1",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      reference_id: "AZY-order-1",
      request_amount: 795000,
      currency: "IDR",
      channel_code: "QRIS",
    });
  });

  it("parses a Payment v3 webhook that only identifies the payment request", () => {
    expect(parseXenditWebhook({
      event: "payment.capture",
      created: "2026-07-31T00:00:00Z",
      data: {
        payment_request_id: "pr-8877c08a-740d-4153-9816-3d744ed197a5",
        request_amount: 795000,
        currency: "IDR",
        status: "SUCCEEDED",
        payment_details: { network_transaction_id: "network-1" },
      },
    })).toMatchObject({
      providerPaymentId: "pr-8877c08a-740d-4153-9816-3d744ed197a5",
      referenceId: null,
      amount: 795000,
      currency: "IDR",
      status: "SUCCEEDED",
      networkTransactionId: "network-1",
    });
  });

  it("parses a Payment Request status webhook with a merchant reference", () => {
    expect(parseXenditWebhook({
      event_id: "event-1",
      event: "payment_request.succeeded",
      data: {
        payment_request_id: "pr-8877c08a-740d-4153-9816-3d744ed197a5",
        reference_id: "AZY-order-1",
        request_amount: "795000",
        currency: "idr",
        status: "SUCCEEDED",
      },
    })).toMatchObject({
      eventId: "event-1",
      providerPaymentId: "pr-8877c08a-740d-4153-9816-3d744ed197a5",
      referenceId: "AZY-order-1",
      amount: 795000,
      currency: "IDR",
    });
  });

  it("rejects unsupported checkout channels before calling Xendit", async () => {
    process.env.XENDIT_SECRET_KEY = "xnd_development_test";
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(createXenditPackPayment({
      referenceId: "AZY-order-1",
      amount: 795000,
      channel: "BANK_TRANSFER",
      idempotencyKey: "payment-order-1",
    })).rejects.toThrow("Unsupported Xendit channel");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
