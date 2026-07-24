// Lead Machine — Zod schemas for AI structured output.
// These define the EXACT shapes the AI must return. Used by generateObject()
// in the website-generation and lead-qualification functions.
//
// The inferred TypeScript types match the legacy GeneratedWebsiteContent and
// LeadQualification types so downstream code (services, route handlers, UI)
// does not change.
import { z } from "zod";

export const websiteServiceSchema = z.object({
  name: z.string().max(100).describe("Service name"),
  description: z.string().max(300).describe("One-sentence service description"),
});

export const websiteFaqSchema = z.object({
  question: z.string().max(200).describe("A question a prospective client would ask"),
  answer: z.string().max(500).describe("A concise answer"),
});

export const generatedWebsiteContentSchema = z.object({
  heroHeadline: z
    .string()
    .max(200)
    .describe("Punchy headline with the business name, max 12 words"),
  heroSubtext: z
    .string()
    .max(400)
    .describe("One sentence subtext explaining the value, max 25 words"),
  aboutText: z
    .string()
    .max(1000)
    .describe("2-3 sentences about the business, warm and professional"),
  services: z
    .array(websiteServiceSchema)
    .min(3)
    .max(6)
    .describe("3 to 6 services derived from the services list"),
  faq: z
    .array(websiteFaqSchema)
    .min(3)
    .max(6)
    .describe("3 to 6 FAQs a prospective client would ask"),
  ctaText: z.string().max(100).describe("Short call-to-action, max 6 words"),
});

export const leadQualificationSchema = z.object({
  score: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Lead score 1-10 based on intent, urgency, budget, and fit"),
  temperature: z
    .enum(["hot", "warm", "cold"])
    .describe("hot (8-10, urgent/ready), warm (5-7, needs follow-up), cold (1-4, vague/poor fit)"),
  reason: z
    .string()
    .max(500)
    .describe("One sentence explaining the score"),
  suggestedAction: z
    .string()
    .max(200)
    .describe("Short next step for the business owner"),
});

export type GeneratedWebsiteContent = z.infer<typeof generatedWebsiteContentSchema>;
export type LeadQualification = z.infer<typeof leadQualificationSchema>;
