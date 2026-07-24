import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/v1/selftest — checks configuration presence (no network calls, no secrets revealed).
// Reports which env vars + integrations are configured so you can verify deployment health.
export async function GET() {
  const checks = {
    database: Boolean(process.env.DATABASE_URL),
    clerk: {
      publishableKey: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      secretKey: Boolean(process.env.CLERK_SECRET_KEY),
    },
    ai: Boolean(process.env.GROQ_API_KEY), // Vercel AI SDK → Groq (free, OpenAI-compatible endpoint)
    whatsapp: {
      evolutionApiUrl: Boolean(process.env.EVOLUTION_API_URL),
      evolutionApiKey: Boolean(process.env.EVOLUTION_GLOBAL_API_KEY),
      simulate: process.env.SIMULATE_WHATSAPP !== "false", // defaults to true
    },
    billing: {
      payfastMerchantId: Boolean(process.env.PAYFAST_MERCHANT_ID), // Phase 6
      payfastMerchantKey: Boolean(process.env.PAYFAST_MERCHANT_KEY),
    },
  };

  const allCritical = checks.database && checks.clerk.publishableKey && checks.clerk.secretKey;

  return NextResponse.json({
    ok: allCritical,
    timestamp: new Date().toISOString(),
    checks,
  });
}
