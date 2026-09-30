// Lead Machine — inbound WhatsApp auto-reply engine.
// Uses the same Operator boundary as outbound notifications. AI failures fall
// back to a deterministic, safe response so inbound WhatsApp never breaks lead capture.

import { generateText } from "ai";
import { getModel, AINotConfiguredError } from "@/lib/ai/provider";
import { createMessage } from "@/modules/whatsapp/service";
import { emitEvent } from "@/modules/events/service";
import { operatorConfigured, sendText } from "@/lib/integrations/whatsapp-operator/client";
import type { DbLead, DbOrganization } from "@/lib/db/schema";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function fallbackReply(org: DbOrganization, lead: DbLead, inboundText: string) {
  if (/^(stop|unsubscribe|opt[- ]?out|cancel|remove me|no more)$/i.test(inboundText.trim())) {
    return "You’re opted out of further WhatsApp messages from " + org.name + ". If you need help again, you can message us anytime.";
  }

  const service = lead.serviceNeeded || "your enquiry";
  return (
    "Hi " + firstName(lead.name) + " 👋 Thanks for contacting " + org.name + " about " + service +
    ". We’ve received your message. Please send your suburb/location and what you need help with, and our team will take it from there."
  );
}

async function draftReply(org: DbOrganization, lead: DbLead, inboundText: string): Promise<string> {
  try {
    const model = getModel();
    const { text } = await generateText({
      model,
      system:
        "You are the WhatsApp first-response assistant for a South African service business. " +
        "Reply in South African English. Be warm, concise and practical. Never invent pricing, " +
        "availability, guarantees or facts. Ask for only the next missing details needed to progress the enquiry. " +
        "Keep the reply under 70 words.",
      prompt:
        "Business: " + org.name + "\n" +
        "Industry: " + org.industry + "\n" +
        "Services: " + (org.services || "(not specified)") + "\n" +
        "Lead name: " + lead.name + "\n" +
        "Known service: " + (lead.serviceNeeded || "(not specified)") + "\n" +
        "Inbound WhatsApp message:\n" + inboundText,
    });
    const cleaned = text.trim();
    if (cleaned) return cleaned;
  } catch (error) {
    if (!(error instanceof AINotConfiguredError)) {
      console.error("[whatsapp auto-reply] AI draft failed", error);
    }
  }

  return fallbackReply(org, lead, inboundText);
}

export type AutoReplyResult = {
  sent: boolean;
  simulated: boolean;
  content: string | null;
  reason?: string;
};

export async function sendInboundAutoReply(opts: {
  org: DbOrganization;
  lead: DbLead;
  inboundText: string;
}): Promise<AutoReplyResult> {
  if (process.env.WHATSAPP_AUTO_REPLY_ENABLED === "false") {
    return { sent: false, simulated: false, content: null, reason: "disabled" };
  }

  const content = await draftReply(opts.org, opts.lead, opts.inboundText);
  const simulate = process.env.SIMULATE_WHATSAPP === "true";

  if (simulate) {
    try {
      await createMessage({
        orgId: opts.org.id,
        leadId: opts.lead.id,
        direction: "outbound",
        phoneNumber: opts.lead.phone,
        content,
        messageType: "auto-reply",
        status: "simulated",
      });
    } catch (error) {
      console.error("[whatsapp auto-reply] simulation log failed", error);
    }
    await emitEvent({
      orgId: opts.org.id,
      eventType: "whatsapp.auto_reply_sent",
      payload: { leadId: opts.lead.id, simulated: true },
    });
    return { sent: true, simulated: true, content };
  }

  if (!operatorConfigured() || !opts.org.whatsappAccountId) {
    return {
      sent: false,
      simulated: false,
      content,
      reason: "WhatsApp Operator or account is not configured",
    };
  }

  try {
    const result = await sendText({
      waAccountId: opts.org.whatsappAccountId,
      orgId: opts.org.id,
      to: opts.lead.phone,
      text: content,
    });
    const sent = result.ok !== false;

    try {
      await createMessage({
        orgId: opts.org.id,
        leadId: opts.lead.id,
        direction: "outbound",
        phoneNumber: opts.lead.phone,
        content,
        messageType: "auto-reply",
        status: sent ? "sent" : "failed",
      });
    } catch (error) {
      console.error("[whatsapp auto-reply] message log failed", error);
    }

    await emitEvent({
      orgId: opts.org.id,
      eventType: sent ? "whatsapp.auto_reply_sent" : "whatsapp.auto_reply_failed",
      payload: { leadId: opts.lead.id, simulated: false, error: result.error },
    });

    return {
      sent,
      simulated: false,
      content,
      reason: sent ? undefined : result.error || "WhatsApp send failed",
    };
  } catch (error) {
    console.error("[whatsapp auto-reply] send failed", error);
    return {
      sent: false,
      simulated: false,
      content,
      reason: error instanceof Error ? error.message : "WhatsApp send failed",
    };
  }
}
