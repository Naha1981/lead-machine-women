// Lead Machine — AI service (z-ai-web-dev-sdk)
import ZAI from "z-ai-web-dev-sdk";
import type { WebsiteService, WebsiteFaq } from "@/types";

let zaiSingleton: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiSingleton) zaiSingleton = await ZAI.create();
  return zaiSingleton;
}

export type GeneratedWebsiteContent = {
  heroHeadline: string;
  heroSubtext: string;
  aboutText: string;
  services: WebsiteService[];
  faq: WebsiteFaq[];
  ctaText: string;
};

export type LeadQualification = {
  score: number; // 1-10
  temperature: "hot" | "warm" | "cold";
  reason: string;
  suggestedAction: string;
};

function extractJson(raw: string): any {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown fences and try again
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Try to find first { ... } block
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          /* ignore */
        }
      }
    }
  }
  return null;
}

/** Generate website content (hero, about, services, faq) from a business profile. */
export async function generateWebsiteContent(opts: {
  businessName: string;
  industry: string;
  services: string;
  template?: string;
}): Promise<GeneratedWebsiteContent> {
  const zai = await getZai();
  const sys = `You are a conversion copywriter for South African SMEs. You write clear, trustworthy, benefit-driven website copy in South African English. Always respond with valid JSON only, no markdown.`;
  const user = `Generate website content for a South African business.

Business name: ${opts.businessName}
Industry: ${opts.industry}
Services offered: ${opts.services}
Template style: ${opts.template || "professional"}

Return JSON in EXACTLY this shape:
{
  "heroHeadline": "string — punchy headline with the business name, max 12 words",
  "heroSubtext": "string — one sentence subtext explaining the value, max 25 words",
  "aboutText": "string — 2-3 sentences about the business, warm and professional",
  "services": [{ "name": "string", "description": "string — one sentence" }, ...3 to 5 services derived from the services list],
  "faq": [{ "question": "string", "answer": "string — concise" }, ...4 FAQs a prospective client would ask],
  "ctaText": "string — short call-to-action, max 6 words"
}

Use South African English spelling and tone. Make it sound professional and credible.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = extractJson(raw);
  if (!parsed) {
    // Fallback content
    return {
      heroHeadline: `${opts.businessName} — Trusted ${opts.industry} Partners`,
      heroSubtext: `Professional ${opts.industry.toLowerCase()} services tailored to your needs.`,
      aboutText: `${opts.businessName} is a trusted South African ${opts.industry.toLowerCase()} firm committed to delivering real results for our clients.`,
      services: [
        { name: "Initial Consultation", description: "A thorough review of your situation and needs." },
      ],
      faq: [
        { question: "How do I get started?", answer: "Fill in the form and we'll call you within 2 hours." },
      ],
      ctaText: "Get a Free Consultation",
    };
  }
  return {
    heroHeadline: String(parsed.heroHeadline ?? "").slice(0, 200),
    heroSubtext: String(parsed.heroSubtext ?? "").slice(0, 400),
    aboutText: String(parsed.aboutText ?? "").slice(0, 1000),
    services: Array.isArray(parsed.services)
      ? parsed.services.slice(0, 6).map((s: any) => ({
          name: String(s?.name ?? "").slice(0, 100),
          description: String(s?.description ?? "").slice(0, 300),
        }))
      : [],
    faq: Array.isArray(parsed.faq)
      ? parsed.faq.slice(0, 6).map((f: any) => ({
          question: String(f?.question ?? "").slice(0, 200),
          answer: String(f?.answer ?? "").slice(0, 500),
        }))
      : [],
    ctaText: String(parsed.ctaText ?? "Get a Free Consultation").slice(0, 100),
  };
}

/** Qualify a lead: score 1-10, hot/warm/cold, reason. */
export async function qualifyLead(opts: {
  businessName: string;
  industry: string;
  services: string;
  leadName: string;
  phone: string;
  serviceNeeded?: string;
  message?: string;
}): Promise<LeadQualification> {
  const zai = await getZai();
  const sys = `You are an expert lead-qualification AI for South African SMEs. You score inbound leads based on intent, urgency, budget signals, and fit. Always respond with valid JSON only, no markdown.`;
  const user = `Qualify this lead for a South African business.

Business: ${opts.businessName} (${opts.industry})
Services offered: ${opts.services}

Lead details:
- Name: ${opts.leadName}
- Phone: ${opts.phone}
- Service needed: ${opts.serviceNeeded || "(not specified)"}
- Message: ${opts.message || "(not specified)"}

Return JSON in EXACTLY this shape:
{
  "score": <integer 1-10>,
  "temperature": "hot" | "warm" | "cold",
  "reason": "string — one sentence explaining the score",
  "suggestedAction": "string — short next step for the business owner"
}

Scoring guide:
- 8-10 (hot): clear urgent need, specific service requested, ready to act
- 5-7 (warm): genuine interest, some detail, needs follow-up
- 1-4 (cold): vague, spammy, or poor fit`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = extractJson(raw);
  if (!parsed) {
    return {
      score: 5,
      temperature: "warm",
      reason: "Unable to fully qualify — manual review recommended.",
      suggestedAction: "Call the lead within 2 hours.",
    };
  }
  let score = Number(parsed.score);
  if (!Number.isFinite(score)) score = 5;
  score = Math.max(1, Math.min(10, Math.round(score)));
  let temperature: "hot" | "warm" | "cold" = "warm";
  const t = String(parsed.temperature ?? "").toLowerCase();
  if (t === "hot" || t === "warm" || t === "cold") temperature = t;
  else temperature = score >= 8 ? "hot" : score >= 5 ? "warm" : "cold";
  return {
    score,
    temperature,
    reason: String(parsed.reason ?? "").slice(0, 500),
    suggestedAction: String(parsed.suggestedAction ?? "").slice(0, 200),
  };
}

/** Chatbot reply for a website visitor. */
export async function chatReply(opts: {
  businessName: string;
  industry: string;
  services: string;
  faq: WebsiteFaq[];
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const zai = await getZai();
  const faqText = opts.faq.length
    ? opts.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
    : "(no FAQ provided)";
  const sys = `You are the friendly AI assistant for ${opts.businessName}, a South African ${opts.industry} business.

Services offered: ${opts.services}

Frequently asked questions:
${faqText}

Your job:
- Answer visitor questions about the business clearly and concisely.
- Sound warm, professional, and trustworthy — South African English.
- Keep replies under 80 words.
- If a visitor seems interested, encourage them to fill the lead form so the business can WhatsApp them back.
- Never invent prices or guarantees not in the FAQ. If unsure, say "Fill in the form and we'll get back to you with details."`;

  const messages: { role: "assistant" | "user"; content: string }[] = [
    { role: "assistant", content: sys },
    ...(opts.history ?? []),
    { role: "user", content: opts.message },
  ];
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "Sorry, I didn't catch that. Could you fill the form and we'll WhatsApp you back?";
}
