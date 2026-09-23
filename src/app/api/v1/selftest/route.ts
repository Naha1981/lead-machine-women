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
    ai: Boolean(process.env.GROQ_API_KEY),
    whatsapp: {
      operatorUrl: Boolean(process.env.OPERATOR_URL),
      operatorApiKey: Boolean(process.env.OPERATOR_API_KEY),
      webhookSecret: Boolean(process.env.WEBHOOK_SECRET),
      appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      simulate: process.env.SIMULATE_WHATSAPP === "true",
    },
    billing: {
      payfastMerchantId: Boolean(process.env.PAYFAST_MERCHANT_ID),
      payfastMerchantKey: Boolean(process.env.PAYFAST_MERCHANT_KEY),
      payfastPassphrase: Boolean(process.env.PAYFAST_PASSPHRASE),
    },
    github: {
      appId: Boolean(process.env.GITHUB_APP_ID),
      appSlug: Boolean(process.env.GITHUB_APP_SLUG),
      privateKey: Boolean(process.env.GITHUB_APP_PRIVATE_KEY),
      stateSecret: Boolean(process.env.GITHUB_APP_STATE_SECRET),
      appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    },
  };

  const allCritical =
    checks.database &&
    checks.clerk.publishableKey &&
    checks.clerk.secretKey &&
    checks.ai &&
    checks.whatsapp.operatorUrl &&
    checks.whatsapp.operatorApiKey &&
    checks.whatsapp.webhookSecret &&
    checks.whatsapp.appUrl;

  return NextResponse.json({
    ok: allCritical,
    timestamp: new Date().toISOString(),
    checks,
  });
}
