// Lead Machine — AI provider factory (Vercel AI SDK).
//
// Provider-agnostic: routes through the Vercel AI SDK so swapping Groq →
// OpenAI → Anthropic is a one-file change here.
//
// CURRENT PROVIDER: Groq (FREE, no credit card) via the OpenAI-compatible
// endpoint at https://api.groq.com/openai/v1. Default model: openai/gpt-oss-120b.
// Override via AI_MODEL env var.
//
// To switch back to paid OpenAI later: delete the `baseURL` line and change
// GROQ_API_KEY → OPENAI_API_KEY in getModel() + isAIConfigured().
//
// BUILD RESILIENCE: GROQ_API_KEY is read LAZILY at call time (never at module
// load). If no key is configured, getModel() throws AINotConfiguredError which
// the AI functions catch and return as a structured error.

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
 * Uses Groq's OpenAI-compatible endpoint (https://api.groq.com/openai/v1)
 * via the already-installed @ai-sdk/openai package — no new dependency needed.
 *
 * To switch to paid OpenAI: remove the `baseURL` option and use
 * `process.env.OPENAI_API_KEY` instead of `process.env.GROQ_API_KEY`.
 */
export function getModel() {
  if (!process.env.GROQ_API_KEY) {
    throw new AINotConfiguredError();
  }
  // Lazy require so the provider is never loaded at build time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createOpenAI } = require("@ai-sdk/openai") as typeof import("@ai-sdk/openai");

  // Groq exposes an OpenAI-compatible endpoint. We create an OpenAI client
  // pointed at Groq's baseURL — same Vercel AI SDK, zero new packages.
  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
  });

  return groq(process.env.AI_MODEL || "openai/gpt-oss-120b");
}
