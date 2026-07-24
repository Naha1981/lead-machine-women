import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth";
import { getWebsiteForOrg } from "@/modules/websites/service";
import type { WebsiteService, WebsiteFaq } from "@/modules/websites/service";

export const dynamic = "force-dynamic";

// GET /api/website/get  — current org's website (for dashboard)
export async function GET() {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const website = await getWebsiteForOrg(org.id);
    if (!website) return NextResponse.json({ website: null });
    return NextResponse.json({
      website: {
        id: website.id,
        orgId: website.orgId,
        template: website.template,
        heroHeadline: website.heroHeadline,
        heroSubtext: website.heroSubtext,
        aboutText: website.aboutText,
        services: (website.services as WebsiteService[] | null) ?? [],
        faq: (website.faq as WebsiteFaq[] | null) ?? [],
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
