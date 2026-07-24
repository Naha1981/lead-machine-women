import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/webhooks/evolution — inbound webhook stub for Phase 5.5.
// Evolution sends inbound WhatsApp messages here. For now: log + return 200
// so the URL exists for Evolution configuration. Phase 5.5 will wire this to
// route replies to the right tenant + let the AI chatbot converse over WhatsApp.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    console.log("[webhook:evolution] inbound payload:", JSON.stringify(body)?.slice(0, 500));
    // Phase 5.5: parse the event type (message.received, connection.update, etc.),
    // find the tenant by instance name, and route the message to the AI chatbot.
  } catch (e) {
    console.error("[webhook:evolution] parse error:", e);
  }
  // Always 200 so Evolution doesn't retry
  return NextResponse.json({ ok: true });
}

// GET — useful for Evolution webhook verification
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "evolution-webhook" });
}
