type PayoneerPaymentInput = {
  referenceId: string;
  usdCents: number;
  customerEmail: string;
};

export async function createPayoneerPayment(input: PayoneerPaymentInput, checkoutUrl?: string) {
  const configuredUrl = checkoutUrl || process.env.PAYONEER_PAYMENT_URL;
  if (!configuredUrl) throw new Error("Payoneer payment link is not configured");
  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
    throw new Error("Payoneer payment link must use HTTPS");
  }
  url.searchParams.set("reference", input.referenceId);
  url.searchParams.set("amount", (input.usdCents / 100).toFixed(2));
  url.searchParams.set("currency", "USD");
  url.searchParams.set("customer_email", input.customerEmail);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (appUrl) url.searchParams.set("return_url", new URL("/portal/billing", appUrl).toString());
  return {
    providerPaymentId: input.referenceId,
    action: { type: "REDIRECT" as const, url: url.toString() },
  };
}
