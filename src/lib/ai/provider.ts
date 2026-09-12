// Lead Machine — AI provider factory (Vercel AI SDK).
//
// Provider-agnostic: routes through the Vercel AI SDK so swapping Groq →
// OpenAI → Anthropic is a one-file change here.
//
// CURRENT PROVIDER: Groq (FREE, no credit card) via the OpenAI-compatible
// endpoint at https://api.groq.com/openai/v1. Default model: openai/gpt-oss-120b.
// Override via AI_MODEL env var.
//
// BUILD RESILIENCE: GROQ_API_KEY is read at call time. If no key is set,
// getModel() throws AINotConfiguredError. The provider SDK itself is imported
// normally because @ai-sdk/openai 4.x is ESM-only.
import { createOpenAI } from "@ai-sdk/openai";

export class AINotConfiguredError extends Error {
  code = "AI_NOT_CONFIGURED" as const;
  constructor() {
    super(
      "AI provider is not configured. Set GROQ_API_KEY in your environment to enable AI features."
    );
    this.name = "AINotConfiguredError";
  }
}

/**
 * Returns true if the AI provider is configured (key present).
 * Used by selftest + graceful-degradation checks.
 */
export function isAIConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Lazily create the AI model. Reads GROQ_API_KEY + AI_MODEL at call time.
 * Throws AINotConfiguredError if no key is set.
 *
 * Uses Groq's OpenAI-compatible endpoint via @ai-sdk/openai.
 */
export function getModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AINotConfiguredError();
  }

  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  return groq(process.env.AI_MODEL || "openai/gpt-oss-120b");
}
