import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Subscriptions are retired. Azyume uses one-time project payments." }, { status: 410 });
}
