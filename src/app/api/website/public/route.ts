import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/website/public?slug=... — public site data (no auth)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    const org = await db.organization.findUnique({ where: { slug } });
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const website = await db.website.findUnique({ where: { orgId: org.id } });
    if (!website || !website.published) {
      return NextResponse.json({ error: "Website not published yet" }, { status: 404 });
    }

    return NextResponse.json({
      org: {
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        services: org.services,
        primaryColor: org.primaryColor,
        whatsappNumber: org.whatsappNumber,
        whatsappConnected: org.whatsappConnected,
      },
      website: {
        id: website.id,
        template: website.template,
        heroHeadline: website.heroHeadline,
        heroSubtext: website.heroSubtext,
        aboutText: website.aboutText,
        services: safeParse(website.services),
        faq: safeParse(website.faq),
        ctaText: website.ctaText,
      },
    });
  } catch (e: any) {
    console.error("[public website]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

function safeParse(s: string | null): any[] {
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
