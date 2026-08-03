import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy credit and standalone render quotes are retired. Use the verified project quote endpoint." },
    { status: 410 },
  );
}
