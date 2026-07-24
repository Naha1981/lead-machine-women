// Lead Machine — WhatsApp simulator (persists messages via the whatsapp service;
// in production this would call Evolution API — Phase 5). Records what *would*
// be sent so the dashboard can show a realistic notification feed.
import { createMessage } from "@/modules/whatsapp/service";

export type WhatsAppSendResult = {
  ok: boolean;
  messageId: string | null;
  content: string;
  to: string;
};

function normalizePhone(raw: string): string {
  // strip spaces, ensure leading +
  let s = raw.replace(/[^\d+]/g, "");
  if (!s.startsWith("+")) s = "+" + s;
  return s;
}

/** "Send" a WhatsApp message to the prospect confirming their enquiry was received. */
export async function sendProspectConfirmation(opts: {
  orgId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  businessName: string;
}): Promise<WhatsAppSendResult> {
  const content = `Hi ${opts.leadName.split(" ")[0]} 👋

Thanks for reaching out to ${opts.businessName}! We've received your enquiry.

Our team will WhatsApp or call you within 2 hours during business hours (Mon-Fri 8am-5pm SAST).

Reference: #${opts.leadId.slice(-6).toUpperCase()}

— ${opts.businessName}`;

  const msg = await createMessage({
    orgId: opts.orgId,
    leadId: opts.leadId,
    direction: "outbound",
    phoneNumber: normalizePhone(opts.leadPhone),
    content,
    messageType: "text",
    status: "sent",
  });
  return { ok: true, messageId: msg.id, content, to: msg.phoneNumber };
}

/** "Send" a WhatsApp notification to the business owner about a new qualified lead. */
export async function sendOwnerNotification(opts: {
  orgId: string;
  leadId: string;
  ownerPhone: string;
  leadName: string;
  leadPhone: string;
  serviceNeeded?: string;
  score: number;
  temperature: "hot" | "warm" | "cold";
  reason: string;
  businessName: string;
}): Promise<WhatsAppSendResult> {
  const emoji = opts.temperature === "hot" ? "🔥" : opts.temperature === "warm" ? "⚡" : "❄️";
  const content = `${emoji} NEW LEAD for ${opts.businessName}

Name: ${opts.leadName}
Phone: ${opts.leadPhone}
Service: ${opts.serviceNeeded || "(not specified)"}
AI Score: ${opts.score}/10 — ${opts.temperature.toUpperCase()}

Why: ${opts.reason}

Call them within 2 hours to maximise conversion. ✅`;

  const msg = await createMessage({
    orgId: opts.orgId,
    leadId: opts.leadId,
    direction: "outbound",
    phoneNumber: normalizePhone(opts.ownerPhone),
    content,
    messageType: "text",
    status: "sent",
  });
  return { ok: true, messageId: msg.id, content, to: msg.phoneNumber };
}
