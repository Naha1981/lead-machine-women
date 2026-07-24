// Lead Machine — AI service (Vercel AI SDK).
//
// Three AI features:
//   1. generateWebsiteContent() — generateObject + Zod schema (website copy)
//   2. qualifyLead()            — generateObject + Zod schema (lead scoring)
//   3. streamChatReply()        — streamText (chatbot, streaming response)
//
// Provider-agnostic: routes through getModel() in provider.ts. Default model
// gpt-4o-mini; override via AI_MODEL env var.
//
// BUILD RESILIENCE: OPENAI_API_KEY is read lazily inside getModel(). If no key
// is configured, the AI functions throw AINotConfiguredError which the route
// handlers catch and return as { error: { code: "AI_NOT_CONFIGURED" } }.
import { generateObject, streamText } from "ai";
import { getModel, AINotConfiguredError } from "@/lib/ai/provider";
import {
  generatedWebsiteContentSchema,
  leadQualificationSchema,
  type GeneratedWebsiteContent,
  type LeadQualification,
} from "@/lib/ai/schemas";
import type { WebsiteFaq } from "@/types";

// Re-export the types + error so existing imports from "@/lib/ai" still work
export type { GeneratedWebsiteContent, LeadQualification };
export { AINotConfiguredError };

// ---------------------------------------------------------------------------
// 1. Website generation
// ---------------------------------------------------------------------------

export async function generateWebsiteContent(opts: {
  businessName: string;
  industry: string;
  services: string;
  template?: string;
}): Promise<GeneratedWebsiteContent> {
  const model = getModel(); // throws AINotConfiguredError if no key

  const system = `You are a conversion copywriter for South African SMEs. You write clear, trustworthy, benefit-driven website copy in South African English. Use South African spelling and tone. Make it sound professional and credible.`;

  const prompt = `Generate website content for a South African business.

Business name: ${opts.businessName}
Industry: ${opts.industry}
Services offered: ${opts.services}
Template style: ${opts.template || "professional"}

Generate the hero headline (punchy, includes the business name, max 12 words), hero subtext (one sentence explaining the value, max 25 words), about text (2-3 sentences, warm and professional), 3-5 services (name + one-sentence description), 3-5 FAQs (question + concise answer), and a short CTA (max 6 words).`;

  const { object } = await generateObject({
    model,
    schema: generatedWebsiteContentSchema,
    system,
    prompt,
  });

  return object;
}

// ---------------------------------------------------------------------------
// 2. Lead qualification
// ---------------------------------------------------------------------------

export async function qualifyLead(opts: {
  businessName: string;
  industry: string;
  services: string;
  leadName: string;
  phone: string;
  serviceNeeded?: string;
  message?: string;
}): Promise<LeadQualification> {
  const model = getModel(); // throws AINotConfiguredError if no key

  const system = `You are an expert lead-qualification AI for South African SMEs. You score inbound leads based on intent, urgency, budget signals, and fit.`;

  const prompt = `Qualify this lead for a South African business.

Business: ${opts.businessName} (${opts.industry})
Services offered: ${opts.services}

Lead details:
- Name: ${opts.leadName}
- Phone: ${opts.phone}
- Service needed: ${opts.serviceNeeded || "(not specified)"}
- Message: ${opts.message || "(not specified)"}

Scoring guide:
- 8-10 (hot): clear urgent need, specific service requested, ready to act
- 5-7 (warm): genuine interest, some detail, needs follow-up
- 1-4 (cold): vague, spammy, or poor fit

Score this lead and provide a reason + suggested next action.`;

  const { object } = await generateObject({
    model,
    schema: leadQualificationSchema,
    system,
    prompt,
  });

  return object;
}

// ---------------------------------------------------------------------------
// 3. Chatbot (streaming)
// ---------------------------------------------------------------------------

/**
 * Stream a chatbot reply for a website visitor. Returns a Response with a
 * text stream (compatible with `await res.text()` on the client).
 */
export async function streamChatReply(opts: {
  businessName: string;
  industry: string;
  services: string;
  faq: WebsiteFaq[];
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<Response> {
  const model = getModel(); // throws AINotConfiguredError if no key

  const faqText = opts.faq.length
    ? opts.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "(no FAQ provided)";

  const system = `You are the friendly AI assistant for ${opts.businessName}, a South African ${opts.industry} business.

Services offered: ${opts.services}

Frequently asked questions:
${faqText}

Your job:
- Answer visitor questions about the business clearly and concisely.
- Sound warm, professional, and trustworthy — South African English.
- Keep replies under 80 words.
- If a visitor seems interested, encourage them to fill the lead form so the business can WhatsApp them back.
- Never invent prices or guarantees not in the FAQ. If unsure, say "Fill in the form and we'll get back to you with details."`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
    ...(opts.history ?? []).map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: opts.message },
  ];

  const result = streamText({
    model,
    messages,
  });

  // Return a text stream response. The client reads it via `await res.text()`.
  return result.toTextStreamResponse();
}

// ---------------------------------------------------------------------------
// Legacy non-streaming chatReply (kept for backward compat; delegates to stream)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use streamChatReply() for streaming. This non-streaming wrapper
 * is kept for any code that still expects a string return.
 */
export async function chatReply(opts: {
  businessName: string;
  industry: string;
  services: string;
  faq: WebsiteFaq[];
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const res = await streamChatReply(opts);
  return await res.text();
}
