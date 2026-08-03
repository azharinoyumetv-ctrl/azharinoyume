import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "This legacy checkout was retired. Use the guided one-time project order flow." }, { status: 410 }); }
