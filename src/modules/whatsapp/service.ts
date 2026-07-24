// Lead Machine — whatsapp messages service (simulated send, real DB persistence).
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { whatsappMessages, leads } from "@/lib/db/schema";
import { emitEvent } from "@/modules/events/service";

export type MessageRow = typeof whatsappMessages.$inferSelect;

export async function createMessage(opts: {
  orgId: string;
  leadId?: string | null;
  direction: "inbound" | "outbound";
  phoneNumber: string;
  content: string;
  messageType?: string;
  status?: string;
}): Promise<MessageRow> {
  const db = await getDb();
  const rows = await db
    .insert(whatsappMessages)
    .values({
      orgId: opts.orgId,
      leadId: opts.leadId ?? null,
      direction: opts.direction,
      phoneNumber: opts.phoneNumber,
      content: opts.content,
      messageType: opts.messageType ?? "text",
      status: opts.status ?? "sent",
    })
    .returning();
  const msg = rows[0];
  await emitEvent({
    orgId: opts.orgId,
    eventType: "whatsapp.sent",
    payload: { messageId: msg.id, leadId: opts.leadId ?? null, direction: opts.direction },
  });
  return msg;
}

export type MessageWithLead = MessageRow & {
  lead: { name: string; phone: string | null } | null;
};

export async function listMessagesForOrg(orgId: string, limit = 50): Promise<MessageWithLead[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: whatsappMessages.id,
      orgId: whatsappMessages.orgId,
      leadId: whatsappMessages.leadId,
      direction: whatsappMessages.direction,
      phoneNumber: whatsappMessages.phoneNumber,
      content: whatsappMessages.content,
      messageType: whatsappMessages.messageType,
      status: whatsappMessages.status,
      createdAt: whatsappMessages.createdAt,
      leadName: leads.name,
      leadPhone: leads.phone,
    })
    .from(whatsappMessages)
    .leftJoin(leads, eq(whatsappMessages.leadId, leads.id))
    .where(eq(whatsappMessages.orgId, orgId))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    leadId: r.leadId,
    direction: r.direction,
    phoneNumber: r.phoneNumber,
    content: r.content,
    messageType: r.messageType,
    status: r.status,
    createdAt: r.createdAt,
    lead: r.leadName ? { name: r.leadName, phone: r.leadPhone } : null,
  }));
}
