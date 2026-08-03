import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Customer credit wallets are retired. Azyume uses one-time project payments." }, { status: 410 });
}
