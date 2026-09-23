import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { updateLeadStatus } from "@/modules/leads/service";
import { cancelLeadFollowUps } from "@/modules/followups/service";

const schema = z.object({
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
});

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const lead = await updateLeadStatus(id, org.id, parsed.data.status);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (parsed.data.status === "won" || parsed.data.status === "lost") {
      await cancelLeadFollowUps(id, org.id);
    }

    return NextResponse.json({
      lead: {
        id: lead.id,
        orgId: lead.orgId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        serviceNeeded: lead.serviceNeeded,
        message: lead.message,
        source: lead.source,
        aiScore: lead.aiScore,
        aiTemperature: lead.aiTemperature,
        aiReason: lead.aiReason,
        status: lead.status,
        whatsappSent: lead.whatsappSent,
        ownerNotified: lead.ownerNotified,
        consentGiven: lead.consentGiven,
        optedOutAt: lead.optedOutAt?.toISOString() ?? null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    console.error("[leads PUT]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
