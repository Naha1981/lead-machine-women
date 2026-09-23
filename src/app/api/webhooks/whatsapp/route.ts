import { NextResponse } from "next/server";
import { appId, operatorConfigured, sendText, verifyWebhookSignature } from "@/lib/integrations/whatsapp-operator/client";
import { createLead, findLeadByPhone, optOutLead, updateLeadStatus } from "@/modules/leads/service";
import { createMessage } from "@/modules/whatsapp/service";
import { getOrgByWhatsAppAccountId } from "@/modules/orgs/service";
import { cancelLeadFollowUps } from "@/modules/followups/service";
import { emitEvent } from "@/modules/events/service";
import { qualifyLead } from "@/lib/ai";

export const dynamic = "force-dynamic";

function normalizePhone(raw: string) {
  let value = raw.replace(/\\D/g, "");
  if (value.startsWith("0")) value = "27" + value.slice(1);
  return value;
}

function extractText(message: any): string {
  const m = message?.message ?? {};
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentWithCaptionMessage?.message?.documentMessage?.caption ??
    ""
  );
}

function isOptOut(text: string) {
  return /^(stop|unsubscribe|opt[- ]?out|cancel|remove me|no more)$/i.test(text.trim());
}

export async function POST(req: Request) {
  const raw = await req.text();
  try {
    if (!operatorConfigured()) return NextResponse.json({ error: "WhatsApp Operator not configured" }, { status: 503 });

    const signature = req.headers.get("X-Webhook-Signature");
    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(raw);
    if (payload?.appId !== appId()) return NextResponse.json({ error: "Invalid app scope" }, { status: 403 });
    const accountId = String(payload?.waAccountId ?? "");
    const tenantId = String(payload?.tenantId ?? "");
    if (!accountId || !tenantId) return NextResponse.json({ error: "Missing account scope" }, { status: 400 });

    const org = await getOrgByWhatsAppAccountId(accountId);
    if (!org || org.id !== tenantId) return NextResponse.json({ error: "Unknown tenant" }, { status: 403 });

    const key = payload?.message?.key ?? {};
    if (key.fromMe) return NextResponse.json({ ok: true, ignored: "outbound" });
    const remoteJid = String(key.remoteJid ?? "");
    if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) {
      return NextResponse.json({ ok: true, ignored: "non-direct" });
    }

    const phone = normalizePhone(remoteJid.split("@")[0] || "");
    const text = extractText(payload?.message);
    if (!phone) return NextResponse.json({ ok: true, ignored: "no-phone" });

    let lead = await findLeadByPhone(org.id, phone);
    if (!lead && text) {
      let aiScore: number | null = null;
      let aiTemperature: "hot" | "warm" | "cold" | null = null;
      let aiReason: string | null = null;
      try {
        const qualification = await qualifyLead({
          businessName: org.name,
          industry: org.industry,
          services: org.services ?? "",
          leadName: phone,
          phone,
          message: text,
        });
        aiScore = qualification.score;
        aiTemperature = qualification.temperature;
        aiReason = `${qualification.reason} → ${qualification.suggestedAction}`;
      } catch {
        // Inbound WhatsApp must never fail because AI is unavailable.
      }

      lead = await createLead({
        orgId: org.id,
        name: phone,
        phone,
        message: text,
        source: "whatsapp",
        aiScore,
        aiTemperature,
        aiReason,
        status: "new",
        consentGiven: false,
      });
    }

    await createMessage({
      orgId: org.id,
      leadId: lead?.id ?? null,
      direction: "inbound",
      phoneNumber: phone,
      content: text || "[non-text WhatsApp message]",
      messageType: "text",
      status: "received",
    });

    if (lead) {
      if (isOptOut(text)) {
        await optOutLead(lead.id, org.id);
        await cancelLeadFollowUps(lead.id, org.id);
      } else if (!["won", "lost"].includes(lead.status)) {
        await updateLeadStatus(lead.id, org.id, "contacted");
        await cancelLeadFollowUps(lead.id, org.id);
      }
    }

    await emitEvent({
      orgId: org.id,
      eventType: "whatsapp.received",
      payload: { leadId: lead?.id ?? null, phone, messageId: key.id ?? null },
    });

    // Do not send an unsolicited AI reply by default. The inbound message is
    // captured, associated with the lead, and removes scheduled follow-ups.
    return NextResponse.json({ ok: true, leadId: lead?.id ?? null });
  } catch (e: any) {
    console.error("[whatsapp webhook]", e?.message ?? e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "whatsapp-webhook" });
}
