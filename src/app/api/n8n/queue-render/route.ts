import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "Legacy render queue retired. Use the authenticated /api/v1/orders/:id/render flow." }, { status: 410 }); }
