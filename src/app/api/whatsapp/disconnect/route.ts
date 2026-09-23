import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { disconnectAccount, operatorConfigured } from "@/lib/integrations/whatsapp-operator/client";
import { updateOrg } from "@/modules/orgs/service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clerkUser = await currentUser();
    const user = await getOrCreateUserByClerkId(userId, { email: clerkUser?.emailAddresses?.[0]?.emailAddress });
    const org = await getOwnedOrgForUser(user.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (org.whatsappAccountId && operatorConfigured()) await disconnectAccount(org.whatsappAccountId, org.id);
    const updated = await updateOrg(org.id, { whatsappConnected: false });
    return NextResponse.json({ ok: true, org: updated });
  } catch (e: any) {
    console.error("[whatsapp disconnect]", e);
    return NextResponse.json({ error: e?.message ?? "Failed to disconnect WhatsApp" }, { status: 500 });
  }
}
