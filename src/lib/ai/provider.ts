import Anthropic from "@anthropic-ai/sdk";

type GeminiResponse = {
  error?: { message?: string };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export type AITextResult = { text: string; provider: "anthropic" | "gemini"; model: string; inputTokens: number; outputTokens: number };

export async function generateAIText(input: { prompt: string; system?: string; premium?: boolean; maxTokens?: number }): Promise<AITextResult> {
  let primaryError: unknown;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const model = input.premium ? (process.env.ANTHROPIC_MODEL_PREMIUM || "claude-sonnet-4-6") : (process.env.ANTHROPIC_MODEL_CHEAP || "claude-haiku-4-5-20251001");
      const response = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({ model, max_tokens: input.maxTokens || 1024, system: input.system, messages: [{ role: "user", content: input.prompt }] });
      return { text: response.content[0]?.type === "text" ? response.content[0].text : "", provider: "anthropic", model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    } catch (error) { primaryError = error; }
  }
  if (process.env.GEMINI_API_KEY) {
    const model = input.premium ? (process.env.GEMINI_MODEL_PREMIUM || "gemini-2.5-pro") : (process.env.GEMINI_MODEL_CHEAP || "gemini-2.5-flash");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: input.system ? { parts: [{ text: input.system }] } : undefined, contents: [{ role: "user", parts: [{ text: input.prompt }] }], generationConfig: { maxOutputTokens: input.maxTokens || 1024 } }) });
    const data = await response.json() as GeminiResponse;
    if (!response.ok) throw new Error(data.error?.message || `Gemini ${response.status}`);
    return { text: data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "", provider: "gemini", model, inputTokens: Number(data.usageMetadata?.promptTokenCount || 0), outputTokens: Number(data.usageMetadata?.candidatesTokenCount || 0) };
  }
  throw primaryError instanceof Error ? primaryError : new Error("No AI provider is configured");
}
