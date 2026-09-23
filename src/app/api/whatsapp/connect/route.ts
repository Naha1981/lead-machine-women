import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { updateOrg } from "@/modules/orgs/service";
import { createAccount, connectAccount, getStatus, operatorConfigured } from "@/lib/integrations/whatsapp-operator/client";

export const dynamic = "force-dynamic";

async function getOrg() {
  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await currentUser();
  const user = await getOrCreateUserByClerkId(userId, {
    email: clerkUser?.emailAddresses?.[0]?.emailAddress,
  });
  return getOwnedOrgForUser(user.id);
}

export async function POST() {
  try {
    const org = await getOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!operatorConfigured()) {
      return NextResponse.json({ error: "WhatsApp Operator is not configured." }, { status: 503 });
    }

    let accountId = org.whatsappAccountId;
    if (!accountId) {
      const account = await createAccount({ orgId: org.id, label: org.name });
      accountId = account.waAccountId;
      await updateOrg(org.id, { whatsappAccountId: accountId, whatsappConnected: false });
    }

    await connectAccount(accountId, org.id);
    const status = await getStatus(accountId, org.id).catch(() => null);
    if (status?.isConnected) {
      await updateOrg(org.id, {
        whatsappConnected: true,
        whatsappNumber: status.phoneNumber ?? org.whatsappNumber ?? undefined,
      });
    }

    return NextResponse.json({ accountId, status: status?.status ?? "connecting" });
  } catch (e: any) {
    console.error("[whatsapp connect]", e);
    return NextResponse.json({ error: e?.message ?? "Failed to connect WhatsApp" }, { status: 500 });
  }
}
