// Lead Machine — events service (event-driven standard).
// Every significant action emits a row to the `events` table.
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

export type EventType =
  | "user.signed_up"
  | "user.signed_in"
  | "org.created"
  | "org.updated"
  | "website.generated"
  | "website.published"
  | "website.unpublished"
  | "lead.created"
  | "lead.qualified"
  | "lead.status_changed"
  | "whatsapp.sent"
  | "subscription.created"
  | "subscription.updated"
  | "audit.completed"
  | "audit.lead_captured"
  | "audit.project.created"
  | "audit.project.status_changed"
  | "audit.project.verified";

/**
 * Append a domain event. Never throws — event emission is best-effort so it can
 * never break the calling flow.
 */
export async function emitEvent(opts: {
  orgId?: string | null;
  userId?: string | null;
  eventType: EventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(events).values({
      orgId: opts.orgId ?? null,
      userId: opts.userId ?? null,
      eventType: opts.eventType,
      payload: opts.payload ?? null,
    });
  } catch (e) {
    // Event emission must never break the caller.
    console.error("[events] emit failed:", (e as Error)?.message);
  }
}
