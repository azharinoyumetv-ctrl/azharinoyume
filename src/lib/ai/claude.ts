import { prisma } from "@/lib/prisma";
import { generateAIText } from "@/lib/ai/provider";
import { z } from "zod";

const LeadScoreSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.record(z.string(), z.number().min(0).max(10)),
  proposal: z.string().min(1).optional(),
});

interface AICallOptions {
  orderId?: string;
  purpose: string;
  usePremium?: boolean;
  systemPrompt?: string;
  maxTokens?: number;
}

function usdPerMillionTokens(provider: string, model: string) {
  const envNumber = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  if (provider === "gemini") {
    const premium = model.toLowerCase().includes("pro");
    return premium
      ? {
          input: envNumber("GEMINI_PRO_INPUT_USD_PER_MILLION_TOKENS", 1.25),
          output: envNumber("GEMINI_PRO_OUTPUT_USD_PER_MILLION_TOKENS", 10),
        }
      : {
          input: envNumber("GEMINI_FLASH_INPUT_USD_PER_MILLION_TOKENS", 0.3),
          output: envNumber("GEMINI_FLASH_OUTPUT_USD_PER_MILLION_TOKENS", 2.5),
        };
  }

  const economy = model.toLowerCase().includes("haiku");
  return economy
    ? {
        input: envNumber("ANTHROPIC_HAIKU_INPUT_USD_PER_MILLION_TOKENS", 1),
        output: envNumber("ANTHROPIC_HAIKU_OUTPUT_USD_PER_MILLION_TOKENS", 5),
      }
    : {
        input: envNumber("ANTHROPIC_SONNET_INPUT_USD_PER_MILLION_TOKENS", 3),
        output: envNumber("ANTHROPIC_SONNET_OUTPUT_USD_PER_MILLION_TOKENS", 15),
      };
}

export async function callClaude(prompt: string, opts: AICallOptions): Promise<string> {
  const response = await generateAIText({
    prompt,
    premium: opts.usePremium,
    maxTokens: opts.maxTokens ?? 1024,
    system:
      opts.systemPrompt ||
      "You are a professional video editing assistant. Be concise and practical.",
  });
  const model = response.model;
  const text = response.text;

  const rates = usdPerMillionTokens(response.provider, model);
  const costUsd =
    (response.inputTokens * rates.input + response.outputTokens * rates.output) / 1_000_000;

  if (opts.orderId) {
    await prisma.aiUsageLog.create({
      data: {
        orderId: opts.orderId,
        model,
        purpose: opts.purpose,
        provider: response.provider,
        promptVersion: "v1",
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd,
      },
    });
    await prisma.costLog.create({
      data: {
        orderId: opts.orderId,
        costType: "ai",
        amount: costUsd,
        description: `AI: ${opts.purpose} (${model})`,
      },
    });
  }

  return text;
}

export async function translateToEnglish(text: string, sourceLang: string, orderId?: string): Promise<string> {
  if (sourceLang === "en") return text;

  const prompt = `Translate the following video editing instructions from ${sourceLang} to English. Keep all technical terms, style descriptions, and specific requests exactly. Do not add anything, do not change meaning. Output only the translated text.

Text to translate:
${text}`;

  return callClaude(prompt, { orderId, purpose: "translation", usePremium: false });
}

export async function generateEditBrief(orderData: {
  orderId: string;
  package: string;
  purpose: string;
  visualStyle: string;
  mood: string;
  editingPace: string;
  colorGrade: string;
  captionStyle: string;
  musicStyle: string;
  platform: string;
  aspectRatio: string;
  resolution: string;
  frameRate: string;
  customerPromptEn: string;
}): Promise<string> {
  const isPremium = orderData.package === "premium";

  const prompt = `You are a professional video editor creating a detailed editing brief.

Order details:
- Package: ${orderData.package}
- Purpose: ${orderData.purpose}
- Visual Style: ${orderData.visualStyle}
- Mood: ${orderData.mood}
- Editing Pace: ${orderData.editingPace}
- Color Grade: ${orderData.colorGrade}
- Captions: ${orderData.captionStyle}
- Music: ${orderData.musicStyle}
- Platform: ${orderData.platform}
- Aspect Ratio: ${orderData.aspectRatio}
- Resolution: ${orderData.resolution}
- Frame Rate: ${orderData.frameRate}

Customer instructions:
${orderData.customerPromptEn}

Create a structured editing brief with these sections:
1. OBJECTIVE (1-2 sentences)
2. TECHNICAL SPECS (resolution, aspect ratio, frame rate, format)
3. EDITING STYLE (pace, transitions, color grade approach)
4. CONTENT PRIORITIES (what to include, what to cut)
5. AUDIO (music style, caption/subtitle requirements)
6. DELIVERY FORMAT

Be specific and actionable. Use imperative form ("Use warm tones", "Cut boring pauses").`;

  return callClaude(prompt, {
    orderId: orderData.orderId,
    purpose: "edit_brief",
    usePremium: isPremium,
    systemPrompt: "You are a senior video editor creating precise editing briefs. Be concise and technical.",
  });
}

export async function generatePromptFromForm(formData: {
  purpose: string;
  visualStyle: string;
  mood: string;
  editingPace: string;
  colorGrade: string;
  captionStyle: string;
  musicStyle: string;
  platform: string;
  aspectRatio: string;
  resolution: string;
  customerNotes?: string;
}): Promise<string> {
  const prompt = `Generate a clear, natural video editing prompt based on these selections:
Purpose: ${formData.purpose}
Style: ${formData.visualStyle}
Mood: ${formData.mood}
Pace: ${formData.editingPace}
Color: ${formData.colorGrade}
Captions: ${formData.captionStyle}
Music: ${formData.musicStyle}
Platform: ${formData.platform}
Aspect ratio: ${formData.aspectRatio}
Resolution: ${formData.resolution}
Customer notes: ${formData.customerNotes || "none"}

Write a 3-5 sentence natural language prompt the customer can review and edit. First person ("I want..."). Include specific style, mood, technical requirements, and what to include/exclude. Make it clear and actionable for a video editor.`;

  return (await generateAIText({ prompt, maxTokens: 300 })).text;
}

export async function scoreJobLead(job: { title: string; description: string; budget?: string }): Promise<{
  score: number;
  breakdown: Record<string, number>;
  proposal?: string;
  model: string;
}> {
  const prompt = `Score this freelance video editing job lead and draft a proposal if score >= 65.

Job:
Title: ${job.title}
Description: ${job.description}
Budget: ${job.budget || "not specified"}

Score each criterion 1-10:
- Relevance to AI video editing (weight 30%)
- Budget potential (weight 25%)
- Client quality indicators (weight 15%)
- Deadline feasibility (weight 10%)
- Competition level (lower = better, weight 10%)
- Language/communication clarity (weight 5%)
- Risk level (lower risk = higher score, weight 5%)

Calculate final weighted score (0-100).

If score >= 65, write a 150-word personalized proposal.

Respond in this JSON format:
{
  "score": 72,
  "breakdown": {
    "relevance": 8, "budget": 7, "client_quality": 6,
    "deadline": 7, "competition": 6, "language": 8, "risk": 7
  },
  "proposal": "Dear client, ..."
}`;

  const result = await generateAIText({ prompt, maxTokens: 600 });
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Opportunity scoring did not return JSON");
  const parsed = LeadScoreSchema.parse(JSON.parse(jsonMatch[0]));
  return { ...parsed, model: result.model };
}
