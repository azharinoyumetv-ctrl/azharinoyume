import { NextRequest, NextResponse } from "next/server";

// Stripe stub — activate by installing `stripe` SDK and setting STRIPE_SECRET_KEY env var
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not yet configured" }, { status: 503 });
  }

  // Full implementation pending — wire up same pattern as Xendit webhook once Stripe is activated
  return NextResponse.json({ received: true });
}
