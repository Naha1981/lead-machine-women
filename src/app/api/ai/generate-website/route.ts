import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/auth";
import { generateWebsiteContent } from "@/lib/ai";

const schema = z.object({
  businessName: z.string().min(2).max(120),
  industry: z.string().min(2).max(60),
  services: z.string().max(1000),
  template: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const content = await generateWebsiteContent({
      businessName: parsed.data.businessName,
      industry: parsed.data.industry,
      services: parsed.data.services,
      template: parsed.data.template,
    });

    // Upsert website row for this org
    const existing = await db.website.findUnique({ where: { orgId: org.id } });
    let website;
    if (existing) {
      website = await db.website.update({
        where: { orgId: org.id },
        data: {
          template: parsed.data.template ?? existing.template,
          heroHeadline: content.heroHeadline,
          heroSubtext: content.heroSubtext,
          aboutText: content.aboutText,
          services: JSON.stringify(content.services),
          faq: JSON.stringify(content.faq),
          ctaText: content.ctaText,
        },
      });
    } else {
      website = await db.website.create({
        data: {
          orgId: org.id,
          template: parsed.data.template ?? "professional",
          heroHeadline: content.heroHeadline,
          heroSubtext: content.heroSubtext,
          aboutText: content.aboutText,
          services: JSON.stringify(content.services),
          faq: JSON.stringify(content.faq),
          ctaText: content.ctaText,
        },
      });
    }

    return NextResponse.json({
      website: {
        id: website.id,
        orgId: website.orgId,
        template: website.template,
        heroHeadline: website.heroHeadline,
        heroSubtext: website.heroSubtext,
        aboutText: website.aboutText,
        services: content.services,
        faq: content.faq,
        ctaText: website.ctaText,
        published: website.published,
        createdAt: website.createdAt.toISOString(),
        updatedAt: website.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    console.error("[generate-website]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
