// Lead Machine — AI provider factory (Vercel AI SDK).
//
// Provider-agnostic: routes through the Vercel AI SDK so swapping OpenAI →
// Groq → Anthropic is a one-file change here. Default model: gpt-4o-mini
// (cheap/fast). Override via AI_MODEL env var.
//
// BUILD RESILIENCE: OPENAI_API_KEY is read LAZILY at call time (never at module
// load). If no key is configured, getModel() throws AINotConfiguredError which
// the AI functions catch and return as a structured error.
//
// NEVER import a provider SDK directly (no `openai`, no `anthropic`). Always
// go through @ai-sdk/<provider> + this factory.

export class AINotConfiguredError extends Error {
  code = "AI_NOT_CONFIGURED" as const;
  constructor() {
    super(
      "AI provider is not configured. Set OPENAI_API_KEY in your environment to enable AI features."
    );
    this.name = "AINotConfiguredError";
  }
}

/**
 * Returns true if the AI provider is configured (key present).
 * Used by selftest + graceful-degradation checks.
 */
export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Lazily create the AI model. Reads OPENAI_API_KEY + AI_MODEL at call time.
 * Throws AINotConfiguredError if no key is set.
 *
 * To swap providers later: replace this function body with e.g.
 *   const { groq } = await import("@ai-sdk/groq");
 *   return groq(process.env.AI_MODEL || "llama-3.1-70b-versatile");
 */
export function getModel() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AINotConfiguredError();
  }
  // Lazy require so the provider is never loaded at build time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { openai } = require("@ai-sdk/openai") as typeof import("@ai-sdk/openai");
  return openai(process.env.AI_MODEL || "gpt-4o-mini");
}
