import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getCurrentOrg } from "@/lib/auth";
import { getOrgBySlug } from "@/modules/orgs/service";
import { createLead, updateLeadFlags, listLeadsForOrg } from "@/modules/leads/service";
import { qualifyLead } from "@/lib/ai";
import { sendProspectConfirmation, sendOwnerNotification } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// PUBLIC: POST /api/leads  — submit a lead from a public site (by slug)
const publicSchema = z.object({
  slug: z.string().min(2).max(60),
  name: z.string().min(2).max(120),
  phone: z.string().min(5).max(30),
  email: z.string().email().max(255).optional().or(z.literal("")),
  serviceNeeded: z.string().max(200).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  consentGiven: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = publicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    if (!parsed.data.consentGiven) {
      return NextResponse.json({ error: "POPIA consent is required." }, { status: 400 });
    }
    const { slug, name, phone, email, serviceNeeded, message } = parsed.data;

    const org = await getOrgBySlug(slug);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // 1) AI qualification
    let aiScore: number | null = null;
    let aiTemperature: "hot" | "warm" | "cold" | null = null;
    let aiReason: string | null = null;
    try {
      const q = await qualifyLead({
        businessName: org.name,
        industry: org.industry,
        services: org.services ?? "",
        leadName: name,
        phone,
        serviceNeeded,
        message,
      });
      aiScore = q.score;
      aiTemperature = q.temperature;
      aiReason = `${q.reason} → ${q.suggestedAction}`;
    } catch (e) {
      console.error("[qualifyLead]", e);
    }

    // 2) Create lead
    const lead = await createLead({
      orgId: org.id,
      name,
      phone,
      email: email || null,
      serviceNeeded: serviceNeeded || null,
      message: message || null,
      source: "website",
      aiScore,
      aiTemperature,
      aiReason,
      status: "new",
      consentGiven: true,
    });

    // 3) WhatsApp confirmation to prospect + notification to owner (simulated)
    let whatsappSent = false;
    let ownerNotified = false;
    try {
      await sendProspectConfirmation({
        orgId: org.id,
        leadId: lead.id,
        leadName: name,
        leadPhone: phone,
        businessName: org.name,
      });
      whatsappSent = true;
    } catch (e) {
      console.error("[sendProspectConfirmation]", e);
    }
    if (org.ownerPhone && aiScore !== null && aiTemperature) {
      try {
        await sendOwnerNotification({
          orgId: org.id,
          leadId: lead.id,
          ownerPhone: org.ownerPhone,
          leadName: name,
          leadPhone: phone,
          serviceNeeded: serviceNeeded || undefined,
          score: aiScore,
          temperature: aiTemperature,
          reason: aiReason ?? "",
          businessName: org.name,
        });
        ownerNotified = true;
      } catch (e) {
        console.error("[sendOwnerNotification]", e);
      }
    }

    if (whatsappSent || ownerNotified) {
      await updateLeadFlags(lead.id, { whatsappSent, ownerNotified });
    }

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      score: aiScore,
      temperature: aiTemperature,
      ref: `#${lead.id.slice(-6).toUpperCase()}`,
    });
  } catch (e: any) {
    console.error("[leads POST]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// AUTH: GET /api/leads — list leads for current org
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // 'all' or specific
    const temperature = url.searchParams.get("temperature");

    const leadRows = await listLeadsForOrg(org.id, {
      status: status ?? undefined,
      temperature: temperature ?? undefined,
    });

    const leads = leadRows.map((l) => ({
      id: l.id,
      orgId: l.orgId,
      name: l.name,
      phone: l.phone,
      email: l.email,
      serviceNeeded: l.serviceNeeded,
      message: l.message,
      source: l.source,
      aiScore: l.aiScore,
      aiTemperature: l.aiTemperature,
      aiReason: l.aiReason,
      status: l.status,
      whatsappSent: l.whatsappSent,
      ownerNotified: l.ownerNotified,
      consentGiven: l.consentGiven,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));

    return NextResponse.json({ leads });
  } catch (e: any) {
    console.error("[leads GET]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
