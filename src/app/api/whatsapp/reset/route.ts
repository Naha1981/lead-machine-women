import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { resetAccount, operatorConfigured } from "@/lib/integrations/whatsapp-operator/client";
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
    if (org.whatsappAccountId && operatorConfigured()) await resetAccount(org.whatsappAccountId, org.id);
    await updateOrg(org.id, { whatsappConnected: false });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[whatsapp reset]", e);
    return NextResponse.json({ error: e?.message ?? "Failed to reset WhatsApp" }, { status: 500 });
  }
}
