import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "This legacy checkout was retired. Use /api/v1/orders, verified uploads, and wallet credits." }, { status: 410 }); }
