import { afterEach, describe, expect, it, vi } from "vitest";
import { createPayoneerPayment } from "./payoneer";

describe("Payoneer payment link", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a reference-bound hosted payment redirect", async () => {
    vi.stubEnv("PAYONEER_PAYMENT_URL", "https://pay.example.test/request");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://azyume.example.test");
    const result = await createPayoneerPayment({ referenceId: "AZY-123", usdCents: 1000, customerEmail: "customer@example.test" });
    const url = new URL(result.action.url);
    expect(url.searchParams.get("reference")).toBe("AZY-123");
    expect(url.searchParams.get("amount")).toBe("10.00");
    expect(url.searchParams.get("currency")).toBe("USD");
    expect(url.searchParams.get("return_url")).toBe("https://azyume.example.test/portal/billing");
  });

  it("rejects an insecure production payment link", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYONEER_PAYMENT_URL", "http://pay.example.test/request");
    await expect(createPayoneerPayment({ referenceId: "AZY-123", usdCents: 100, customerEmail: "customer@example.test" })).rejects.toThrow("HTTPS");
  });
});
