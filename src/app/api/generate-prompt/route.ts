import { NextRequest, NextResponse } from "next/server";
import { generatePromptFromForm } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prompt = await generatePromptFromForm(body);
  return NextResponse.json({ prompt });
}
