import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getSubscriptionForOrg, markSubscriptionCancelled } from "@/modules/billing/service";
import { payfastApiRequest, payfastConfigured } from "@/lib/payments/payfast";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clerkUser = await currentUser();
    const user = await getOrCreateUserByClerkId(userId, { email: clerkUser?.emailAddresses?.[0]?.emailAddress });
    const org = await getOwnedOrgForUser(user.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const sub = await getSubscriptionForOrg(org.id);
    if (!sub) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    if (sub.provider !== "payfast" || !sub.providerToken) {
      return NextResponse.json({ error: "This subscription has no cancellable PayFast token." }, { status: 409 });
    }
    if (!payfastConfigured()) return NextResponse.json({ error: "PayFast is not configured" }, { status: 503 });

    await payfastApiRequest(sub.providerToken, "cancel");
    const updated = await markSubscriptionCancelled(org.id);
    return NextResponse.json({ ok: true, subscription: updated });
  } catch (e: any) {
    console.error("[billing cancel]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Failed to cancel subscription" }, { status: 500 });
  }
}
