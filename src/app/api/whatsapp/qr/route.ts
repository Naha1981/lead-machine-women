import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getQr, operatorConfigured } from "@/lib/integrations/whatsapp-operator/client";

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
      return NextResponse.json({ configured: operatorConfigured(), status: "not_configured", qrCode: null });
    }
    const qr = await getQr(org.whatsappAccountId, org.id);
    return NextResponse.json(qr, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[whatsapp qr]", e);
    return NextResponse.json({ error: e?.message ?? "Failed to load QR" }, { status: 500 });
  }
}
