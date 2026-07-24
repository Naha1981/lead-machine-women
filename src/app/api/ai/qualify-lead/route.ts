import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getLeadForOrg, setLeadQualification } from "@/modules/leads/service";
import { qualifyLead, AINotConfiguredError } from "@/lib/ai";

const schema = z.object({
  leadId: z.string().min(2).max(60),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const lead = await getLeadForOrg(parsed.data.leadId, org.id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const q = await qualifyLead({
      businessName: org.name,
      industry: org.industry,
      services: org.services ?? "",
      leadName: lead.name,
      phone: lead.phone,
      serviceNeeded: lead.serviceNeeded ?? undefined,
      message: lead.message ?? undefined,
    });

    const updated = await setLeadQualification(lead.id, {
      score: q.score,
      temperature: q.temperature,
      reason: `${q.reason} → ${q.suggestedAction}`,
    });

    return NextResponse.json({
      lead: {
        id: (updated ?? lead).id,
        aiScore: (updated ?? lead).aiScore,
        aiTemperature: (updated ?? lead).aiTemperature,
        aiReason: (updated ?? lead).aiReason,
      },
      qualification: q,
    });
  } catch (e: any) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json(
        { error: { code: "AI_NOT_CONFIGURED", message: e.message } },
        { status: 503 }
      );
    }
    console.error("[re-qualify]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
