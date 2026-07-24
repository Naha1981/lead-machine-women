import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrg } from "@/lib/auth";
import { getLeadForOrg, setLeadQualification } from "@/modules/leads/service";
import { qualifyLead } from "@/lib/ai";

const schema = z.object({
  leadId: z.string().min(2).max(60),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    console.error("[re-qualify]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
