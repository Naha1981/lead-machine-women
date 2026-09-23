// Lead Machine — auth service (Phase 2: Clerk identity bridge).
// Identity comes from Clerk. Authorization (tenant scoping) comes from the
// users.clerk_id → users.id → memberships → organizations bridge.
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, memberships, organizations } from "@/lib/db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  clerkId: string | null;
};

/**
 * Look up a user by our internal UUID.
 */
export async function getUserById(id: string): Promise<AuthUser | null> {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Bridge a Clerk userId to our users table. If the user doesn't exist yet
 * (first API call after Clerk sign-up), create a row with the clerk_id.
 * Returns our DB user record (with internal UUID) so domain services can
 * scope by ownerId / userId.
 */
export async function getOrCreateUserByClerkId(
  clerkId: string,
  opts?: { email?: string; name?: string | null }
): Promise<AuthUser> {
  const db = await getDb();

  // 1) Try to find by clerk_id
  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (existing[0]) return existing[0];

  // 2) Not found — create. Use Clerk-provided email/name, or fallbacks.
  const email = opts?.email ?? `clerk-${clerkId}@leadmachine.app`;
  const name = opts?.name ?? null;

  // Guard: if the email already exists (Phase 1 user), link the clerk_id to it
  // instead of creating a duplicate.
  const byEmail = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (byEmail[0]) {
    const rows = await db
      .update(users)
      .set({ clerkId: clerkId, updatedAt: new Date() })
      .where(eq(users.id, byEmail[0].id))
      .returning();
    return rows[0];
  }

  const rows = await db
    .insert(users)
    .values({ email: email.toLowerCase(), name, clerkId: clerkId, passwordHash: null })
    .returning();
  return rows[0];
}

export type OrgForOwner = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  services: string | null;
  logoUrl: string | null;
  primaryColor: string;
  whatsappNumber: string | null;
  whatsappAccountId: string | null;
  whatsappConnected: boolean;
  ownerPhone: string | null;
  plan: string;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Return the org the given user owns (role = owner). */
export async function getOwnedOrgForUser(userId: string): Promise<OrgForOwner | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      industry: organizations.industry,
      services: organizations.services,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      whatsappNumber: organizations.whatsappNumber,
      whatsappConnected: organizations.whatsappConnected,
      ownerPhone: organizations.ownerPhone,
      plan: organizations.plan,
      trialEndsAt: organizations.trialEndsAt,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))
    .limit(5);
  return rows[0] ?? null;
}

export async function hasOwnerMembership(userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  return rows.length > 0;
}
