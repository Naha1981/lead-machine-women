// Lead Machine — billing (subscriptions) service.
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { subscriptions, organizations } from "@/lib/db/schema";
import { emitEvent } from "@/modules/events/service";

export type SubscriptionRow = typeof subscriptions.$inferSelect;

export async function getSubscriptionByPaymentId(paymentId: string): Promise<SubscriptionRow | null> {
  const db = await getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.providerPaymentId, paymentId)).limit(1);
  return rows[0] ?? null;
}

export async function createPendingSubscription(opts: {
  orgId: string;
  plan: string;
  amountZar: number;
  paymentId: string;
}): Promise<SubscriptionRow> {
  const db = await getDb();
  const existing = await getSubscriptionForOrg(opts.orgId);
  if (existing) {
    const rows = await db.update(subscriptions).set({
      plan: opts.plan,
      amountZar: opts.amountZar,
      status: "pending",
      provider: "payfast",
      providerPaymentId: opts.paymentId,
      providerToken: null,
      cancelledAt: null,
    }).where(eq(subscriptions.orgId, opts.orgId)).returning();
    return rows[0];
  }
  const rows = await db.insert(subscriptions).values({
    orgId: opts.orgId,
    plan: opts.plan,
    amountZar: opts.amountZar,
    status: "pending",
    provider: "payfast",
    providerPaymentId: opts.paymentId,
  }).returning();
  return rows[0];
}

export async function getSubscriptionForOrg(orgId: string): Promise<SubscriptionRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);
  return rows[0] ?? null;
}

export async function markSubscriptionCancelled(orgId: string): Promise<SubscriptionRow | null> {
  const db = await getDb();
  const now = new Date();
  const rows = await db.update(subscriptions).set({ status: "cancelled", cancelledAt: now }).where(eq(subscriptions.orgId, orgId)).returning();
  if (rows[0]) {
    await db.update(organizations).set({ plan: "trial", updatedAt: now }).where(eq(organizations.id, orgId));
    await emitEvent({ orgId, eventType: "subscription.updated", payload: { plan: rows[0].plan, status: "cancelled" } });
  }
  return rows[0] ?? null;
}

export async function setSubscriptionPlan(opts: {
  orgId: string;
  plan: string;
  amountZar: number; // cents
  status?: string;
  provider?: string;
  providerPaymentId?: string | null;
  providerToken?: string | null;
}): Promise<SubscriptionRow> {
  const db = await getDb();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const existing = await getSubscriptionForOrg(opts.orgId);
  let row: SubscriptionRow;
  if (existing) {
    const rows = await db
      .update(subscriptions)
      .set({
        plan: opts.plan,
        amountZar: opts.amountZar,
        status: opts.status ?? "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        provider: opts.provider ?? "payfast",
        providerPaymentId: opts.providerPaymentId ?? existing.providerPaymentId,
        providerToken: opts.providerToken ?? existing.providerToken,
      })
      .where(eq(subscriptions.orgId, opts.orgId))
      .returning();
    row = rows[0];
  } else {
    const rows = await db
      .insert(subscriptions)
      .values({
        orgId: opts.orgId,
        plan: opts.plan,
        amountZar: opts.amountZar,
        status: opts.status ?? "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: opts.provider ?? "payfast",
        providerPaymentId: opts.providerPaymentId ?? null,
        providerToken: opts.providerToken ?? null,
      })
      .returning();
    row = rows[0];
    await emitEvent({
      orgId: opts.orgId,
      eventType: "subscription.created",
      payload: { plan: opts.plan, amountZar: opts.amountZar },
    });
  }

  // Keep the org's `plan` column in sync.
  await db.update(organizations).set({ plan: opts.plan, updatedAt: now }).where(eq(organizations.id, opts.orgId));

  await emitEvent({
    orgId: opts.orgId,
    eventType: "subscription.updated",
    payload: { plan: opts.plan, amountZar: opts.amountZar, status: row.status },
  });
  return row;
}
