import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { createAccount, connectAccount, requestPairingCode, operatorConfigured } from "@/lib/integrations/whatsapp-operator/client";
import { updateOrg } from "@/modules/orgs/service";

const schema = z.object({ phoneNumber: z.string().min(8).max(30) });
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clerkUser = await currentUser();
    const user = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(user.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!operatorConfigured()) return NextResponse.json({ error: "WhatsApp Operator is not configured." }, { status: 503 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    let accountId = org.whatsappAccountId;
    if (!accountId) {
      const account = await createAccount({ orgId: org.id, label: org.name });
      accountId = account.waAccountId;
      await updateOrg(org.id, { whatsappAccountId: accountId, whatsappConnected: false });
    }

    await connectAccount(accountId, org.id);
    const result = await requestPairingCode(accountId, org.id, parsed.data.phoneNumber);
    await updateOrg(org.id, { whatsappNumber: parsed.data.phoneNumber });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[whatsapp pairing-code]", e);
    return NextResponse.json({ error: e?.message ?? "Failed to create pairing code" }, { status: 500 });
  }
}
