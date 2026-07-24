import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/auth";
import { qualifyLead } from "@/lib/ai";

const schema = z.object({
  leadId: z.string().min(2).max(60),
});

export async function POST(req: Request) {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const lead = await db.lead.findFirst({ where: { id: parsed.data.leadId, orgId: org.id } });
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

    const updated = await db.lead.update({
      where: { id: lead.id },
      data: {
        aiScore: q.score,
        aiTemperature: q.temperature,
        aiReason: `${q.reason} → ${q.suggestedAction}`,
      },
    });

    return NextResponse.json({
      lead: {
        id: updated.id,
        aiScore: updated.aiScore,
        aiTemperature: updated.aiTemperature,
        aiReason: updated.aiReason,
      },
      qualification: q,
    });
  } catch (e: any) {
    console.error("[re-qualify]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
