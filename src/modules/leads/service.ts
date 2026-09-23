// Lead Machine — leads service.
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { emitEvent } from "@/modules/events/service";

export type LeadRow = typeof leads.$inferSelect;

export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";


function normalizeLeadPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  return digits;
}

export async function createLead(opts: {
  orgId: string;
  name: string;
  phone: string;
  email?: string | null;
  serviceNeeded?: string | null;
  message?: string | null;
  source?: string;
  aiScore?: number | null;
  aiTemperature?: LeadTemperature | null;
  aiReason?: string | null;
  status?: LeadStatus;
  consentGiven?: boolean;
  whatsappSent?: boolean;
  ownerNotified?: boolean;
  optedOutAt?: Date | null;
}): Promise<LeadRow> {
  const db = await getDb();
  const rows = await db
    .insert(leads)
    .values({
      orgId: opts.orgId,
      name: opts.name,
      phone: normalizeLeadPhone(opts.phone),
      email: opts.email ?? null,
      serviceNeeded: opts.serviceNeeded ?? null,
      message: opts.message ?? null,
      source: opts.source ?? "website",
      aiScore: opts.aiScore ?? null,
      aiTemperature: opts.aiTemperature ?? null,
      aiReason: opts.aiReason ?? null,
      status: opts.status ?? "new",
      consentGiven: opts.consentGiven ?? false,
      whatsappSent: opts.whatsappSent ?? false,
      ownerNotified: opts.ownerNotified ?? false,
      optedOutAt: opts.optedOutAt ?? null,
    })
    .returning();
  const lead = rows[0];
  await emitEvent({
    orgId: opts.orgId,
    eventType: "lead.created",
    payload: {
      leadId: lead.id,
      name: lead.name,
      score: lead.aiScore,
      temperature: lead.aiTemperature,
    },
  });
  if (opts.aiScore != null && opts.aiTemperature) {
    await emitEvent({
      orgId: opts.orgId,
      eventType: "lead.qualified",
      payload: { leadId: lead.id, score: opts.aiScore, temperature: opts.aiTemperature },
    });
  }
  return lead;
}

export async function updateLeadFlags(
  leadId: string,
  patch: Partial<{ whatsappSent: boolean; ownerNotified: boolean }>
): Promise<void> {
  const db = await getDb();
  await db.update(leads).set(patch).where(eq(leads.id, leadId));
}

export async function setLeadQualification(
  leadId: string,
  opts: { score: number; temperature: LeadTemperature; reason: string }
): Promise<LeadRow | null> {
  const db = await getDb();
  const rows = await db
    .update(leads)
    .set({
      aiScore: opts.score,
      aiTemperature: opts.temperature,
      aiReason: opts.reason,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) {
    await emitEvent({
      orgId: lead.orgId,
      eventType: "lead.qualified",
      payload: { leadId, score: opts.score, temperature: opts.temperature },
    });
  }
  return lead;
}

export async function findLeadByPhone(orgId: string, phone: string): Promise<LeadRow | null> {
  const db = await getDb();
  const rows = await db.select().from(leads)
    .where(and(eq(leads.orgId, orgId), eq(leads.phone, normalizeLeadPhone(phone))))
    .orderBy(desc(leads.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function optOutLead(leadId: string, orgId: string): Promise<LeadRow | null> {
  const db = await getDb();
  const rows = await db.update(leads)
    .set({ optedOutAt: new Date(), updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) await emitEvent({ orgId, eventType: "lead.opted_out", payload: { leadId } });
  return lead;
}

export async function updateLeadStatus(
  leadId: string,
  orgId: string,
  status: LeadStatus
): Promise<LeadRow | null> {
  const db = await getDb();
  const rows = await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) {
    await emitEvent({
      orgId,
      eventType: "lead.status_changed",
      payload: { leadId, status },
    });
  }
  return lead;
}

export async function getLeadForOrg(leadId: string, orgId: string): Promise<LeadRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listLeadsForOrg(
  orgId: string,
  opts?: { status?: string; temperature?: string }
): Promise<LeadRow[]> {
  const db = await getDb();
  const conds = [eq(leads.orgId, orgId)];
  const { and: AND } = await import("drizzle-orm");
  const status = opts?.status && opts.status !== "all" ? opts.status : null;
  const temp = opts?.temperature && opts.temperature !== "all" ? opts.temperature : null;
  const where =
    status && temp
      ? AND(eq(leads.orgId, orgId), eq(leads.status, status), eq(leads.aiTemperature, temp))
      : status
      ? AND(eq(leads.orgId, orgId), eq(leads.status, status))
      : temp
      ? AND(eq(leads.orgId, orgId), eq(leads.aiTemperature, temp))
      : eq(leads.orgId, orgId);
  return db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(200);
}
