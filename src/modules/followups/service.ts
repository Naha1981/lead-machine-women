// Lead Machine — automated WhatsApp follow-up engine.
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { followUpJobs, leads, organizations } from "@/lib/db/schema";
import { createMessage } from "@/modules/whatsapp/service";
import { emitEvent } from "@/modules/events/service";
import { operatorConfigured, sendText } from "@/lib/integrations/whatsapp-operator/client";

type LeadInput = {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  serviceNeeded: string | null;
  consentGiven: boolean;
  optedOutAt?: Date | null;
  status: string;
};

function renderMessage(template: string, lead: LeadInput) {
  return template
    .replaceAll("{{firstName}}", lead.name.split(/s+/)[0] || lead.name)
    .replaceAll("{{service}}", lead.serviceNeeded || "your enquiry");
}

const templates = [
  {
    offsetMs: 2 * 60 * 60 * 1000,
    message: "Hi {{firstName}} 👋 just checking in on your {{service}} enquiry with {{businessName}}. Reply here and we’ll help you with the next step.",
  },
  {
    offsetMs: 24 * 60 * 60 * 1000,
    message: "Hi {{firstName}}, we’re still here to help with your {{service}} enquiry. Reply to this WhatsApp and our team will assist you.",
  },
  {
    offsetMs: 72 * 60 * 60 * 1000,
    message: "Hi {{firstName}} 👋 last quick follow-up from {{businessName}} regarding your {{service}} enquiry. Reply here whenever you’re ready.",
  },
] as const;

export async function scheduleLeadFollowUps(lead: LeadInput, businessName: string) {
  if (!lead.phone || !lead.consentGiven || lead.optedOutAt || ["won", "lost"].includes(lead.status)) return;
  const db = await getDb();
  const now = Date.now();
  for (const item of templates) {
    await db.insert(followUpJobs).values({
      orgId: lead.orgId,
      leadId: lead.id,
      channel: "whatsapp",
      message: renderMessage(item.message.replaceAll("{{businessName}}", businessName), lead),
      scheduledAt: new Date(now + item.offsetMs),
      status: "pending",
    });
  }
  await emitEvent({
    orgId: lead.orgId,
    eventType: "lead.followups_scheduled",
    payload: { leadId: lead.id, count: templates.length },
  });
}

export async function cancelLeadFollowUps(leadId: string, orgId: string) {
  const db = await getDb();
  await db
    .update(followUpJobs)
    .set({ status: "cancelled" })
    .where(and(eq(followUpJobs.leadId, leadId), eq(followUpJobs.orgId, orgId), eq(followUpJobs.status, "pending")));
}

export async function cancelOrgLeadFollowUpsForPhone(orgId: string, phone: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.orgId, orgId), eq(leads.phone, phone)));
  for (const row of rows) await cancelLeadFollowUps(row.id, orgId);
}

async function claimNextJob(now: Date) {
  const db = await getDb();
  const due = await db
    .select()
    .from(followUpJobs)
    .where(and(eq(followUpJobs.status, "pending"), lte(followUpJobs.scheduledAt, now)))
    .orderBy(asc(followUpJobs.scheduledAt))
    .limit(1);
  const candidate = due[0];
  if (!candidate) return null;

  const rows = await db
    .update(followUpJobs)
    .set({
      status: "processing",
      attempts: sql`${followUpJobs.attempts} + 1`,
      lastAttemptAt: now,
    })
    .where(and(eq(followUpJobs.id, candidate.id), eq(followUpJobs.status, "pending")))
    .returning();
  return rows[0] ?? null;
}

export async function processDueFollowUps(limit = 25) {
  const processed: { jobId: string; status: string }[] = [];
  for (let i = 0; i < limit; i++) {
    const job = await claimNextJob(new Date());
    if (!job) break;

    const db = await getDb();
    const leadRows = await db.select().from(leads).where(eq(leads.id, job.leadId)).limit(1);
    const lead = leadRows[0];
    const orgRows = await db.select().from(organizations).where(eq(organizations.id, job.orgId)).limit(1);
    const org = orgRows[0];

    if (!lead || !org || lead.optedOutAt || ["won", "lost"].includes(lead.status)) {
      await db.update(followUpJobs).set({ status: "cancelled" }).where(eq(followUpJobs.id, job.id));
      processed.push({ jobId: job.id, status: "cancelled" });
      continue;
    }

    let sent = false;
    let messageStatus = "failed";
    try {
      if (operatorConfigured() && org.whatsappAccountId) {
        const result = await sendText({
          waAccountId: org.whatsappAccountId,
          orgId: org.id,
          to: lead.phone,
          text: job.message,
        });
        sent = result?.ok !== false;
        messageStatus = sent ? "sent" : "failed";
      } else if (process.env.SIMULATE_WHATSAPP === "true") {
        sent = true;
        messageStatus = "simulated";
      } else {
        messageStatus = "failed";
      }

      await createMessage({
        orgId: org.id,
        leadId: lead.id,
        direction: "outbound",
        phoneNumber: lead.phone,
        content: job.message,
        messageType: "followup",
        status: messageStatus,
      });
    } catch (error) {
      console.error("[followup] send failed", error);
      sent = false;
    }

    if (sent) {
      await db.update(followUpJobs).set({ status: "sent", sentAt: new Date() }).where(eq(followUpJobs.id, job.id));
      await emitEvent({ orgId: org.id, eventType: "lead.followup_sent", payload: { leadId: lead.id, jobId: job.id } });
      processed.push({ jobId: job.id, status: "sent" });
    } else {
      const nextStatus = job.attempts >= 3 ? "failed" : "pending";
      await db.update(followUpJobs).set({
        status: nextStatus,
        scheduledAt: nextStatus === "pending" ? new Date(Date.now() + 15 * 60 * 1000) : job.scheduledAt,
      }).where(eq(followUpJobs.id, job.id));
      processed.push({ jobId: job.id, status: nextStatus });
    }
  }
  return processed;
}
