import { NextRequest, NextResponse } from "next/server";
import { scoreJobLead } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, link } = await req.json();
  const result = await scoreJobLead({ title, description });
  return NextResponse.json({ ...result, link });
}
