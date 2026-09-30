// Lead Machine — hot lead leakage alert delivery.
// A lead becomes a leakage candidate when it is hot, still new, and older than 15 minutes.

import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads, organizations } from "@/lib/db/schema";
import { createMessage } from "@/modules/whatsapp/service";
import { emitEvent } from "@/modules/events/service";
import { getOrgById } from "@/modules/orgs/service";
import { operatorConfigured, sendText } from "@/lib/integrations/whatsapp-operator/client";
import { sendSmsAlert } from "@/lib/integrations/sms-alerts/client";

const LEAKAGE_WAIT_MS = 15 * 60 * 1000;

export type LeakageProcessResult = {
  leadId: string;
  status: "alerted" | "skipped" | "failed";
  whatsapp?: boolean;
  sms?: boolean;
  reason?: string;
};

function ownerMessage(orgName: string, lead: typeof leads.$inferSelect, waitingMinutes: number): string {
  const score = lead.aiScore == null ? "not scored" : lead.aiScore + "/10";
  return "🚨 HOT LEAD STILL WAITING — " + orgName + "\n\n" +
    "Name: " + lead.name + "\n" +
    "Phone: " + lead.phone + "\n" +
    "Service: " + (lead.serviceNeeded || "Not specified") + "\n" +
    "AI Score: " + score + "\n" +
    "Waiting: " + waitingMinutes + " minutes\n\n" +
    "Nobody has moved this hot lead out of NEW yet. Contact them now."; 
}

async function findCandidates(limit: number) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - LEAKAGE_WAIT_MS);
  return db
    .select()
    .from(leads)
    .where(and(
      eq(leads.aiTemperature, "hot"),
      eq(leads.status, "new"),
      lte(leads.createdAt, cutoff),
      isNull(leads.hotLeadAlertedAt),
    ))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

async function claimCandidate(leadId: string) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - LEAKAGE_WAIT_MS);
  const rows = await db
    .update(leads)
    .set({ hotLeadAlertedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(leads.id, leadId),
      eq(leads.aiTemperature, "hot"),
      eq(leads.status, "new"),
      lte(leads.createdAt, cutoff),
      isNull(leads.hotLeadAlertedAt),
    ))
    .returning();
  return rows[0] ?? null;
}

async function unclaimCandidate(leadId: string) {
  const db = await getDb();
  await db.update(leads)
    .set({ hotLeadAlertedAt: null, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

async function deliverAlert(org: typeof organizations.$inferSelect, lead: typeof leads.$inferSelect) {
  const ownerPhone = org.ownerPhone || org.whatsappNumber;
  if (!ownerPhone) {
    return { delivered: false, whatsapp: false, sms: false, reason: "No owner phone configured" };
  }

  const waitingMinutes = Math.max(15, Math.floor((Date.now() - lead.createdAt.getTime()) / 60000));
  const text = ownerMessage(org.name, lead, waitingMinutes);
  let whatsapp = false;
  let sms = false;

  if (process.env.SIMULATE_WHATSAPP === "true") {
    whatsapp = true;
    try {
      await createMessage({
        orgId: org.id,
        leadId: lead.id,
        direction: "outbound",
        phoneNumber: ownerPhone,
        content: text,
        messageType: "leakage-alert",
        status: "simulated",
      });
    } catch (error) {
      console.error("[leakage] simulation log failed", error);
    }
  } else if (operatorConfigured() && org.whatsappAccountId) {
    try {
      const result = await sendText({
        waAccountId: org.whatsappAccountId,
        orgId: org.id,
        to: ownerPhone,
        text,
      });
      whatsapp = result.ok !== false;
      try {
        await createMessage({
          orgId: org.id,
          leadId: lead.id,
          direction: "outbound",
          phoneNumber: ownerPhone,
          content: text,
          messageType: "leakage-alert",
          status: whatsapp ? "sent" : "failed",
        });
      } catch (error) {
        console.error("[leakage] WhatsApp message log failed", error);
      }
    } catch (error) {
      console.error("[leakage] WhatsApp delivery failed", error);
      try {
        await createMessage({
          orgId: org.id,
          leadId: lead.id,
          direction: "outbound",
          phoneNumber: ownerPhone,
          content: text,
          messageType: "leakage-alert",
          status: "failed",
        });
      } catch {}
    }
  }

  const smsResult = await sendSmsAlert({ to: ownerPhone, text, orgId: org.id });
  sms = smsResult.ok;

  return {
    delivered: whatsapp || sms,
    whatsapp,
    sms,
    reason: whatsapp || sms ? undefined : "No alert channel delivered successfully",
  };
}

export async function processHotLeadLeakageAlerts(limit = 25): Promise<LeakageProcessResult[]> {
  const candidates = await findCandidates(limit);
  const results: LeakageProcessResult[] = [];

  for (const candidate of candidates) {
    const claimed = await claimCandidate(candidate.id);
    if (!claimed) continue;

    const org = await getOrgById(candidate.orgId);
    if (!org) {
      await unclaimCandidate(candidate.id);
      results.push({ leadId: candidate.id, status: "skipped", reason: "Organization not found" });
      continue;
    }

    try {
      const delivery = await deliverAlert(org, claimed);
      if (!delivery.delivered) {
        await unclaimCandidate(candidate.id);
        await emitEvent({
          orgId: org.id,
          eventType: "lead.leakage_alert_failed",
          payload: { leadId: candidate.id, reason: delivery.reason },
        });
        results.push({ leadId: candidate.id, status: "failed", whatsapp: delivery.whatsapp, sms: delivery.sms, reason: delivery.reason });
        continue;
      }

      await emitEvent({
        orgId: org.id,
        eventType: "lead.leakage_alert_sent",
        payload: {
          leadId: candidate.id,
          waitingMinutes: Math.max(15, Math.floor((Date.now() - candidate.createdAt.getTime()) / 60000)),
          whatsapp: delivery.whatsapp,
          sms: delivery.sms,
        },
      });
      results.push({ leadId: candidate.id, status: "alerted", whatsapp: delivery.whatsapp, sms: delivery.sms });
    } catch (error) {
      await unclaimCandidate(candidate.id);
      console.error("[leakage] alert processing failed", error);
      results.push({
        leadId: candidate.id,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown leakage alert error",
      });
    }
  }

  return results;
}
