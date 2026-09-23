import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDemoDentistOrg } from "@/modules/demo/service";
import { createLead, updateLeadFlags } from "@/modules/leads/service";
import { sendLeadNotifications } from "@/modules/notifications/service";
import { scheduleLeadFollowUps } from "@/modules/followups/service";
import { qualifyLead } from "@/lib/ai";

const schema = z.object({
  name: z.string().min(2).max(160),
  phone: z.string().min(8).max(30),
  email: z.string().email().max(255).optional().or(z.literal("")),
  serviceNeeded: z.string().max(255).optional(),
  message: z.string().max(3000).optional(),
  consentGiven: z.literal(true),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const org = await ensureDemoDentistOrg();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid demo lead" }, { status: 400 });

    let q: any = {};
    try {
      q = await qualifyLead({
        businessName: org.name,
        industry: org.industry,
        services: org.services ?? "",
        leadName: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message ?? parsed.data.serviceNeeded ?? "",
      });
    } catch {}

    const lead = await createLead({
      orgId: org.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      serviceNeeded: parsed.data.serviceNeeded || null,
      message: parsed.data.message || null,
      source: "demo-dentist",
      aiScore: q.score ?? null,
      aiTemperature: q.temperature ?? null,
      aiReason: q.reason ? `${q.reason} → ${q.suggestedAction ?? ""}` : null,
      status: "new",
      consentGiven: true,
    });

    const notification = await sendLeadNotifications(
      {
        id: org.id,
        name: org.name,
        whatsappNumber: org.whatsappNumber,
        whatsappAccountId: org.whatsappAccountId,
        ownerPhone: org.ownerPhone,
      },
      {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        serviceNeeded: lead.serviceNeeded,
        aiScore: lead.aiScore,
        aiTemperature:
          lead.aiTemperature === "hot" || lead.aiTemperature === "warm" || lead.aiTemperature === "cold"
            ? lead.aiTemperature
            : null,
        aiReason: lead.aiReason,
      }
    );

    await updateLeadFlags(lead.id, {
      whatsappSent: notification.prospectSent,
      ownerNotified: notification.ownerSent,
    });

    await scheduleLeadFollowUps({
      id: lead.id,
      orgId: lead.orgId,
      name: lead.name,
      phone: lead.phone,
      serviceNeeded: lead.serviceNeeded,
      consentGiven: lead.consentGiven,
      optedOutAt: lead.optedOutAt,
      status: lead.status,
    }, org.name);

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      score: lead.aiScore,
      temperature: lead.aiTemperature,
      simulated: notification.simulated,
    });
  } catch (e: any) {
    console.error("[demo dentist lead]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Demo disabled or unavailable" }, { status: 503 });
  }
}
