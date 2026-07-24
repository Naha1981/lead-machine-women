// Lead Machine — orgs service.
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, memberships, subscriptions } from "@/lib/db/schema";
import { slugify } from "@/lib/constants";
import { emitEvent } from "@/modules/events/service";

export type OrgRow = typeof organizations.$inferSelect;

export async function getOrgBySlug(slug: string): Promise<OrgRow | null> {
  const db = await getDb();
  const rows = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getOrgById(id: string): Promise<OrgRow | null> {
  const db = await getDb();
  const rows = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return rows[0] ?? null;
}

async function uniqueSlug(base: string): Promise<string> {
  const db = await getDb();
  let slug = slugify(base) || "business";
  let suffix = 1;
  while (true) {
    const rows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    if (rows.length === 0) return slug;
    slug = `${slugify(base)}-${suffix++}`;
  }
}

export async function createOrg(opts: {
  name: string;
  industry: string;
  services?: string | null;
  whatsappNumber?: string | null;
  ownerPhone?: string | null;
  primaryColor?: string;
  ownerId: string;
}): Promise<OrgRow> {
  const db = await getDb();
  const slug = await uniqueSlug(opts.name);
  const rows = await db
    .insert(organizations)
    .values({
      name: opts.name,
      slug,
      industry: opts.industry,
      services: opts.services ?? null,
      whatsappNumber: opts.whatsappNumber ?? null,
      ownerPhone: opts.ownerPhone ?? null,
      primaryColor: opts.primaryColor ?? "#059669",
      ownerId: opts.ownerId,
      plan: "trial",
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();
  const org = rows[0];

  await db.insert(memberships).values({
    orgId: org.id,
    userId: opts.ownerId,
    role: "owner",
  });

  // Start a trial subscription row.
  await db
    .insert(subscriptions)
    .values({
      orgId: org.id,
      plan: "trial",
      amountZar: 0,
      status: "trial",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await emitEvent({
    orgId: org.id,
    userId: opts.ownerId,
    eventType: "org.created",
    payload: { name: org.name, slug: org.slug, industry: org.industry },
  });

  return org;
}

export async function updateOrg(
  orgId: string,
  patch: Partial<{
    name: string;
    industry: string;
    services: string;
    whatsappNumber: string;
    ownerPhone: string;
    primaryColor: string;
    whatsappConnected: boolean;
  }>
): Promise<OrgRow> {
  const db = await getDb();
  const rows = await db
    .update(organizations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  const org = rows[0];
  await emitEvent({
    orgId,
    eventType: "org.updated",
    payload: patch as Record<string, unknown>,
  });
  return org;
}
