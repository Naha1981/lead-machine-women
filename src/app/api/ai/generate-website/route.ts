import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { generateWebsiteContent, AINotConfiguredError } from "@/lib/ai";
import { saveGeneratedWebsite } from "@/modules/websites/service";

const schema = z.object({
  businessName: z.string().min(2).max(120),
  industry: z.string().min(2).max(60),
  services: z.string().max(1000),
  template: z.string().max(40).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

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

    const website = await saveGeneratedWebsite({
      orgId: org.id,
      template: parsed.data.template,
      heroHeadline: content.heroHeadline,
      heroSubtext: content.heroSubtext,
      aboutText: content.aboutText,
      services: content.services,
      faq: content.faq,
      ctaText: content.ctaText,
    });

    return NextResponse.json({
      website: {
        id: website.id,
        orgId: website.orgId,
        template: website.template,
        heroHeadline: website.heroHeadline,
        heroSubtext: website.heroSubtext,
        aboutText: website.aboutText,
        services: (website.services as { name: string; description: string }[] | null) ?? [],
        faq: (website.faq as { question: string; answer: string }[] | null) ?? [],
        ctaText: website.ctaText,
        published: website.published,
        createdAt: website.createdAt.toISOString(),
        updatedAt: website.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json(
        { error: { code: "AI_NOT_CONFIGURED", message: e.message } },
        { status: 503 }
      );
    }
    console.error("[generate-website]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
