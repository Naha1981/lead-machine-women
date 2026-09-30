// Lead Machine — AI service (Vercel AI SDK).
//
// Three AI features:
//   1. generateWebsiteContent() — generateText + Output.object (website copy)
//   2. qualifyLead()            — generateText + Output.object (lead scoring)
//   3. streamChatReply()        — streamText (chatbot, streaming response)
//
// Provider-agnostic: routes through getModel() in provider.ts.
// BUILD RESILIENCE: provider credentials are read lazily inside getModel().
import { generateText, Output, streamText } from "ai";
import { getModel, AINotConfiguredError } from "@/lib/ai/provider";
import {
  generatedWebsiteContentSchema,
  leadQualificationSchema,
  type GeneratedWebsiteContent,
  type LeadQualification,
} from "@/lib/ai/schemas";
import type { WebsiteFaq } from "@/types";
import { fallbackLeadQualification, getVerticalPack } from "@/lib/vertical-packs";

export type { GeneratedWebsiteContent, LeadQualification };
export { AINotConfiguredError };

export async function generateWebsiteContent(opts: {
  businessName: string;
  industry: string;
  services: string;
  template?: string;
}): Promise<GeneratedWebsiteContent> {
  const model = getModel();

  const system = `You are a conversion copywriter for South African SMEs. You write clear, trustworthy, benefit-driven website copy in South African English. Use South African spelling and tone. Make it sound professional and credible.`;
  const prompt = `Generate website content for a South African business.

Business name: ${opts.businessName}
Industry: ${opts.industry}
Services offered: ${opts.services}
Template style: ${opts.template || "professional"}

Generate the hero headline (punchy, includes the business name, max 12 words), hero subtext (one sentence explaining the value, max 25 words), about text (2-3 sentences, warm and professional), 3-5 services (name + one-sentence description), 3-5 FAQs (question + concise answer), and a short CTA (max 6 words).`;

  const { output } = await generateText({
    model,
    output: Output.object({ schema: generatedWebsiteContentSchema }),
    system,
    prompt,
  });

  return output;
}

export async function qualifyLead(opts: {
  businessName: string;
  industry: string;
  services: string;
  leadName: string;
  phone: string;
  serviceNeeded?: string;
  message?: string;
}): Promise<LeadQualification> {
  const pack = getVerticalPack(opts.industry);

  try {
    const model = getModel();
    const packQuestions = pack
      ? pack.qualificationQuestions
          .map((q) => "- " + q.label + ": " + q.prompt + (q.required ? " (required)" : ""))
          .join("\n")
      : "(no vertical pack selected)";

    const system = "You are an expert lead-qualification AI for South African SMEs. You score inbound leads based on intent, urgency, budget signals, and fit.\n" +
      "When a vertical intelligence pack is present, use its qualification requirements and urgency cues to interpret the enquiry. Do not invent answers to unanswered qualification questions.";

    const prompt = "Qualify this lead for a South African business.\n\n" +
      "Business: " + opts.businessName + " (" + opts.industry + ")\n" +
      "Services offered: " + opts.services + "\n\n" +
      "Vertical intelligence pack: " + (pack?.label ?? "Generic") + "\n" +
      "Recommended qualification questions:\n" + packQuestions + "\n\n" +
      "Lead details:\n" +
      "- Name: " + opts.leadName + "\n" +
      "- Phone: " + opts.phone + "\n" +
      "- Service needed: " + (opts.serviceNeeded || "(not specified)") + "\n" +
      "- Message: " + (opts.message || "(not specified)") + "\n\n" +
      "Scoring guide:\n" +
      "- 8-10 (hot): clear urgent need, specific service requested, ready to act\n" +
      "- 5-7 (warm): genuine interest, some detail, needs follow-up\n" +
      "- 1-4 (cold): vague, spammy, or poor fit\n\n" +
      "Score this lead and provide a reason + suggested next action.";

    const { output } = await generateText({
      model,
      output: Output.object({ schema: leadQualificationSchema }),
      system,
      prompt,
    });

    return output;
  } catch (error) {
    if (error instanceof AINotConfiguredError) {
      return fallbackLeadQualification({
        industry: opts.industry,
        serviceNeeded: opts.serviceNeeded,
        message: opts.message,
        phone: opts.phone,
      });
    }
    throw error;
  }
}

export async function streamChatReply(opts: {
  businessName: string;
  industry: string;
  services: string;
  faq: WebsiteFaq[];
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<Response> {
  const model = getModel();
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
    ...(opts.history ?? []).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: opts.message },
  ];

  const result = streamText({ model, messages });
  return result.toTextStreamResponse();
}

/** @deprecated Use streamChatReply() for streaming. */
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
