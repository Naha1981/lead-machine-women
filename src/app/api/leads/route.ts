import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getOrgBySlug } from "@/modules/orgs/service";
import { createLead, updateLeadFlags, listLeadsForOrg } from "@/modules/leads/service";
import { qualifyLead } from "@/lib/ai";
import { sendLeadNotifications } from "@/modules/notifications/service";
import { scheduleLeadFollowUps } from "@/modules/followups/service";

export const dynamic = "force-dynamic";

// Lightweight in-process rate limiting for public lead submissions.
// Multi-instance deployments should add an edge/shared limiter for stronger guarantees.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(ip);
  if (!current || current.resetAt <= now) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    if (requestCounts.size > 5000) {
      for (const [key, value] of requestCounts) {
        if (value.resetAt <= now) requestCounts.delete(key);
      }
    }
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

const publicSchema = z.object({
  slug: z.string().min(2).max(60),
  name: z.string().min(2).max(120),
  phone: z.string().min(5).max(30),
  email: z.string().email().max(255).optional().or(z.literal("")),
  serviceNeeded: z.string().max(200).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  source: z.enum(["website", "standalone"]).default("website"),
  consentGiven: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > 25_000) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = await req.json();
    const parsed = publicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    if (!parsed.data.consentGiven) {
      return NextResponse.json({ error: "POPIA consent is required." }, { status: 400 });
    }
    const { slug, name, phone, email, serviceNeeded, message, source } = parsed.data;

    const org = await getOrgBySlug(slug);
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });

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

    const lead = await createLead({
      orgId: org.id,
      name,
      phone,
      email: email || null,
      serviceNeeded: serviceNeeded || null,
      message: message || null,
      source,
      aiScore,
      aiTemperature,
      aiReason,
      status: "new",
      consentGiven: true,
    });

    let whatsappSent = false;
    let ownerNotified = false;
    try {
      const notifResult = await sendLeadNotifications(
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

    try {
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
    } catch (e) {
      console.error("[followups schedule]", e);
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
      optedOutAt: l.optedOutAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));

    return NextResponse.json({ leads });
  } catch (e: any) {
    console.error("[leads GET]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
