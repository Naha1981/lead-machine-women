// Lead Machine — notifications service via the shared NahaLabs WhatsApp Operator.
//
// sendLeadNotifications(org, lead) is the SINGLE entry point called by the
// leads route on lead create + AI qualification. It:
//   1. Builds the OWNER notification + PROSPECT confirmation messages.
//   2. If the WhatsApp Operator is configured AND SIMULATE_WHATSAPP !== 'true': sends both
//      via the Operator, then logs each to whatsapp_messages with
//      status 'sent' or 'failed'.
//   3. Else (simulate / unconfigured): logs both to whatsapp_messages with
//      status 'simulated' (preserves the old log-only behavior exactly).
//
// NEVER throws. If a send fails, logs the failure and continues — the lead is
// already saved; WhatsApp failure must not break lead capture.
import { createMessage } from "@/modules/whatsapp/service";
import {
  operatorConfigured,
  sendText,
} from "@/lib/integrations/whatsapp-operator/client";

type LeadTemp = "hot" | "warm" | "cold" | null;

type OrgForNotifications = {
  id: string;
  name: string;
  whatsappNumber: string | null;
  whatsappAccountId: string | null;
  ownerPhone: string | null;
};

type LeadForNotifications = {
  id: string;
  name: string;
  phone: string;
  serviceNeeded: string | null;
  aiScore: number | null;
  aiTemperature: LeadTemp;
  aiReason: string | null;
};

function tempEmoji(temp: LeadTemp): string {
  if (temp === "hot") return "🔥";
  if (temp === "warm") return "⚡";
  if (temp === "cold") return "❄️";
  return "📋";
}

function buildOwnerMessage(org: OrgForNotifications, lead: LeadForNotifications): string {
  const emoji = tempEmoji(lead.aiTemperature);
  const scoreStr = lead.aiScore != null ? `${lead.aiScore}/10` : "not scored";
  const tempStr = lead.aiTemperature ? lead.aiTemperature.toUpperCase() : "PENDING";
  const reason = lead.aiReason ?? "AI qualification pending — review manually.";
  return `${emoji} NEW LEAD for ${org.name}

Name: ${lead.name}
Phone: ${lead.phone}
Service: ${lead.serviceNeeded || "(not specified)"}
AI Score: ${scoreStr} — ${tempStr}

Why: ${reason}

Reply fast — speed wins this client. Call them within 2 hours to maximise conversion. ✅`;
}

function buildProspectMessage(org: OrgForNotifications, lead: LeadForNotifications): string {
  const firstName = lead.name.split(" ")[0] || lead.name;
  return `Hi ${firstName} 👋

Thanks for reaching out to ${org.name}! We've received your enquiry.

Our team will WhatsApp or call you within 2 hours during business hours (Mon-Fri 8am-5pm SAST).

Reference: #${lead.id.slice(-6).toUpperCase()}

— ${org.name}`;
}

export type SendLeadNotificationsResult = {
  ownerSent: boolean;
  prospectSent: boolean;
  simulated: boolean;
};

/**
 * Send lead notifications (owner + prospect) via WhatsApp. Uses the shared Operator when configured; otherwise logs as 'simulated'.
 * NEVER throws.
 */
export async function sendLeadNotifications(
  org: OrgForNotifications,
  lead: LeadForNotifications
): Promise<SendLeadNotificationsResult> {
  const ownerMessage = buildOwnerMessage(org, lead);
  const prospectMessage = buildProspectMessage(org, lead);
  const shouldSimulate =
    !operatorConfigured() || !org.whatsappAccountId || process.env.SIMULATE_WHATSAPP === "true";

  // Determine the owner's phone (prefer whatsappNumber, fall back to ownerPhone)
  const ownerPhone = org.ownerPhone || org.whatsappNumber;

  let ownerSent = false;
  let prospectSent = false;

  // --- Owner notification ---
  if (ownerPhone) {
    if (shouldSimulate) {
      try {
        await createMessage({
          orgId: org.id,
          leadId: lead.id,
          direction: "outbound",
          phoneNumber: ownerPhone,
          content: ownerMessage,
          messageType: "text",
          status: "simulated",
        });
        ownerSent = true;
      } catch (e) {
        console.error("[notifications] owner simulate log failed:", e);
      }
    } else {
      const result = await sendText({ waAccountId: org.whatsappAccountId!, orgId: org.id, to: ownerPhone, text: ownerMessage });
      try {
        await createMessage({
          orgId: org.id,
          leadId: lead.id,
          direction: "outbound",
          phoneNumber: ownerPhone,
          content: ownerMessage,
          messageType: "text",
          status: result.ok ? "sent" : "failed",
        });
        ownerSent = result.ok !== false;
        if (result.ok === false) {
          console.error("[notifications] owner send failed:", result.error);
        }
      } catch (e) {
        console.error("[notifications] owner send log failed:", e);
      }
    }
  }

  // --- Prospect confirmation ---
  if (shouldSimulate) {
    try {
      await createMessage({
        orgId: org.id,
        leadId: lead.id,
        direction: "outbound",
        phoneNumber: lead.phone,
        content: prospectMessage,
        messageType: "text",
        status: "simulated",
      });
      prospectSent = true;
    } catch (e) {
      console.error("[notifications] prospect simulate log failed:", e);
    }
  } else {
    const result = await sendText({ waAccountId: org.whatsappAccountId!, orgId: org.id, to: lead.phone, text: prospectMessage });
    try {
      await createMessage({
        orgId: org.id,
        leadId: lead.id,
        direction: "outbound",
        phoneNumber: lead.phone,
        content: prospectMessage,
        messageType: "text",
        status: result.ok ? "sent" : "failed",
      });
      prospectSent = result.ok !== false;
      if (!result.ok) {
        console.error("[notifications] prospect send failed:", result.error);
      }
    } catch (e) {
      console.error("[notifications] prospect send log failed:", e);
    }
  }

  return {
    ownerSent,
    prospectSent,
    simulated: shouldSimulate,
  };
}
