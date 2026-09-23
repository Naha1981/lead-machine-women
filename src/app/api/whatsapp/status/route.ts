import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { updateOrg } from "@/modules/orgs/service";
import { getStatus, operatorConfigured } from "@/lib/integrations/whatsapp-operator/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clerkUser = await currentUser();
    const user = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(user.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    if (!operatorConfigured() || !org.whatsappAccountId) {
      return NextResponse.json({ configured: operatorConfigured(), accountId: org.whatsappAccountId, status: null, org });
    }

    const status = await getStatus(org.whatsappAccountId, org.id);
    if (status.isConnected !== org.whatsappConnected || status.phoneNumber !== org.whatsappNumber) {
      await updateOrg(org.id, {
        whatsappConnected: status.isConnected,
        whatsappNumber: status.phoneNumber ?? org.whatsappNumber ?? undefined,
      });
    }
    return NextResponse.json({ configured: true, accountId: org.whatsappAccountId, status });
  } catch (e: any) {
    console.error("[whatsapp status]", e);
    return NextResponse.json({ error: e?.message ?? "Failed to read WhatsApp status" }, { status: 500 });
  }
}
