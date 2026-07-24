import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getOrgBySlug } from "@/modules/orgs/service";
import { createLead, updateLeadFlags, listLeadsForOrg } from "@/modules/leads/service";
import { qualifyLead } from "@/lib/ai";
import { sendLeadNotifications } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

// PUBLIC: POST /api/leads — submit a lead from a public site (by slug)
// NO AUTH REQUIRED — this is the core revenue flow (visitor → lead).
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

    // 3) WhatsApp notifications (owner + prospect) via Evolution API or simulate.
    // NEVER throws — failures are logged but don't break lead capture.
    let whatsappSent = false;
    let ownerNotified = false;
    try {
      const notifResult = await sendLeadNotifications(
        {
          id: org.id,
          name: org.name,
          whatsappNumber: org.whatsappNumber,
          ownerPhone: org.ownerPhone,
        },
        {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          serviceNeeded: lead.serviceNeeded,
          aiScore: lead.aiScore,
          aiTemperature: lead.aiTemperature as "hot" | "warm" | "cold" | null,
          aiReason: lead.aiReason,
        }
      );
      whatsappSent = notifResult.prospectSent;
      ownerNotified = notifResult.ownerSent;
    } catch (e) {
      console.error("[sendLeadNotifications]", e);
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

// AUTHED: GET /api/leads — list leads for the current org (dashboard)
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
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
