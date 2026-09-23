import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";

export const dynamic = "force-dynamic";

// GET /api/auth/me — returns the Clerk user + bridged DB user + owned org.
// Returns { user: null, org: null } when there is no Clerk session, so the
// client store can detect the logged-out state cleanly (no 401 redirect).
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ user: null, org: null });
    }

    // Bridge Clerk userId → our users table (creates a row on first call).
    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
      name: clerkUser?.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
        : clerkUser?.username ?? null,
    });

    // Look up the org this user owns.
    let org: Record<string, unknown> | null = null;
    try {
      const o = await getOwnedOrgForUser(dbUser.id);
      if (o) {
        org = {
          id: o.id,
          name: o.name,
          slug: o.slug,
          industry: o.industry,
          services: o.services,
          logoUrl: o.logoUrl,
          primaryColor: o.primaryColor,
          whatsappNumber: o.whatsappNumber,
          whatsappAccountId: o.whatsappAccountId,
          whatsappConnected: o.whatsappConnected,
          ownerPhone: o.ownerPhone,
          plan: o.plan,
          trialEndsAt: o.trialEndsAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        };
      }
    } catch (e) {
      // DATABASE_NOT_CONFIGURED — treat as no org.
    }

    return NextResponse.json({
      user: { id: dbUser.id, email: dbUser.email, name: dbUser.name },
      org,
    });
  } catch (e: any) {
    // If the DB isn't configured (e.g. missing DATABASE_URL in prod), return
    // a clean logged-out response instead of crashing the client.
    console.error("[auth/me]", e);
    return NextResponse.json({ user: null, org: null });
  }
}
