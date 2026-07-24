// Lead Machine — auth service (DB access only; password hashing stays in lib/auth).
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, memberships, organizations } from "@/lib/db/schema";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
};

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(opts: {
  email: string;
  name?: string | null;
  passwordHash: string;
}): Promise<AuthUser> {
  const db = await getDb();
  const rows = await db
    .insert(users)
    .values({
      email: opts.email.toLowerCase(),
      name: opts.name ?? null,
      passwordHash: opts.passwordHash,
    })
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
  const ownerRow = rows.find((r) => true);
  return ownerRow ?? null;
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
