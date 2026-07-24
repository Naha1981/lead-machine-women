// Lead Machine — session auth (cookie-based). DB access is delegated to the
// auth service module. NOTE: this bcrypt session auth is the Phase-1 placeholder;
// Phase 2 replaces it with Clerk.
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getUserById, getOwnedOrgForUser } from "@/modules/auth/service";

export const SESSION_COOKIE = "lm_session";
const SESSION_TTL_DAYS = 30;

function randomToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, `${userId}:${token}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_TTL_DAYS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const userId = raw.split(":")[0];
    if (!userId) return null;
    const user = await getUserById(userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}

export async function getCurrentOrg() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const o = await getOwnedOrgForUser(user.id);
    if (!o) return null;
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      industry: o.industry,
      services: o.services,
      logoUrl: o.logoUrl,
      primaryColor: o.primaryColor,
      whatsappNumber: o.whatsappNumber,
      whatsappConnected: o.whatsappConnected,
      ownerPhone: o.ownerPhone,
      plan: o.plan,
      trialEndsAt: o.trialEndsAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  } catch (e) {
    // DATABASE_NOT_CONFIGURED or similar — treat as no org.
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOrg() {
  const org = await getCurrentOrg();
  if (!org) throw new Error("No organization");
  return org;
}
