import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDokuWebhook } from "./doku";

describe("verifyDokuWebhook", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts a fresh correctly signed callback and rejects tampering", () => {
    process.env.DOKU_CLIENT_ID = "test-client";
    process.env.DOKU_SHARED_KEY = "test-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T00:00:00Z"));
    const body = JSON.stringify({ order: { invoice_number: "PAY-123" } });
    const timestamp = "2026-07-19T00:00:00Z";
    const digest = crypto.createHash("sha256").update(body).digest("base64");
    const canonical = [
      "Client-Id:test-client",
      "Request-Id:req-123",
      `Request-Timestamp:${timestamp}`,
      "Request-Target:/api/webhooks/doku",
      `Digest:${digest}`,
    ].join("\n");
    const signature = `HMACSHA256=${crypto.createHmac("sha256", "test-secret").update(canonical).digest("base64")}`;
    const headers = new Headers({
      "client-id": "test-client",
      "request-id": "req-123",
      "request-timestamp": timestamp,
      signature,
    });

    expect(verifyDokuWebhook(body, headers, "/api/webhooks/doku")).toBe(true);
    expect(verifyDokuWebhook(`${body} `, headers, "/api/webhooks/doku")).toBe(false);
  });

  it("rejects replayed callbacks", () => {
    process.env.DOKU_CLIENT_ID = "test-client";
    process.env.DOKU_SHARED_KEY = "test-secret";
    expect(
      verifyDokuWebhook("{}", new Headers({
        "client-id": "test-client",
        "request-id": "old",
        "request-timestamp": "2020-01-01T00:00:00Z",
        signature: "invalid",
      }), "/api/webhooks/doku"),
    ).toBe(false);
  });
});
