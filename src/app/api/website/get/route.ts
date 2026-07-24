import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/auth";

// GET /api/website/get  — current org's website (for dashboard)
export async function GET() {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const website = await db.website.findUnique({ where: { orgId: org.id } });
    if (!website) return NextResponse.json({ website: null });
    return NextResponse.json({
      website: {
        id: website.id,
        orgId: website.orgId,
        template: website.template,
        heroHeadline: website.heroHeadline,
        heroSubtext: website.heroSubtext,
        aboutText: website.aboutText,
        services: website.services ? safeParse(website.services) : [],
        faq: website.faq ? safeParse(website.faq) : [],
        ctaText: website.ctaText,
        published: website.published,
        createdAt: website.createdAt.toISOString(),
        updatedAt: website.updatedAt.toISOString(),
      },
      org: {
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        services: org.services,
        primaryColor: org.primaryColor,
      },
    });
  } catch (e: any) {
    console.error("[website get]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
