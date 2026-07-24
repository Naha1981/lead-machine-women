import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { listMessagesForOrg } from "@/modules/whatsapp/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const messages = await listMessagesForOrg(org.id, 50);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        phoneNumber: m.phoneNumber,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        lead: m.lead,
      })),
    });
  } catch (e: any) {
    console.error("[whatsapp messages]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
