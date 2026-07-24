// Lead Machine — websites service.
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { websites, organizations } from "@/lib/db/schema";
import { emitEvent } from "@/modules/events/service";

export type WebsiteService = { name: string; description: string };
export type WebsiteFaq = { question: string; answer: string };

export type WebsiteRow = typeof websites.$inferSelect;

export async function getWebsiteForOrg(orgId: string): Promise<WebsiteRow | null> {
  const db = await getDb();
  const rows = await db.select().from(websites).where(eq(websites.orgId, orgId)).limit(1);
  return rows[0] ?? null;
}

export async function saveGeneratedWebsite(opts: {
  orgId: string;
  template?: string;
  heroHeadline: string;
  heroSubtext: string;
  aboutText: string;
  services: WebsiteService[];
  faq: WebsiteFaq[];
  ctaText: string;
}): Promise<WebsiteRow> {
  const db = await getDb();
  const existing = await getWebsiteForOrg(opts.orgId);
  const values = {
    template: opts.template ?? "professional",
    heroHeadline: opts.heroHeadline,
    heroSubtext: opts.heroSubtext,
    aboutText: opts.aboutText,
    services: opts.services,
    faq: opts.faq,
    ctaText: opts.ctaText,
    updatedAt: new Date(),
  };
  let row: WebsiteRow;
  if (existing) {
    const rows = await db
      .update(websites)
      .set(values)
      .where(eq(websites.orgId, opts.orgId))
      .returning();
    row = rows[0];
  } else {
    const rows = await db
      .insert(websites)
      .values({
        orgId: opts.orgId,
        ...values,
      })
      .returning();
    row = rows[0];
  }
  await emitEvent({
    orgId: opts.orgId,
    eventType: "website.generated",
    payload: { websiteId: row.id, template: row.template },
  });
  return row;
}

export async function publishWebsite(orgId: string, published: boolean): Promise<WebsiteRow | null> {
  const db = await getDb();
  const rows = await db
    .update(websites)
    .set({ published, updatedAt: new Date() })
    .where(eq(websites.orgId, orgId))
    .returning();
  const row = rows[0] ?? null;
  if (row) {
    await emitEvent({
      orgId,
      eventType: published ? "website.published" : "website.unpublished",
      payload: { websiteId: row.id },
    });
  }
  return row;
}

export type PublicWebsiteView = {
  org: {
    name: string;
    slug: string;
    industry: string;
    services: string | null;
    primaryColor: string;
    whatsappNumber: string | null;
    whatsappConnected: boolean;
  };
  website: {
    id: string;
    template: string;
    heroHeadline: string | null;
    heroSubtext: string | null;
    aboutText: string | null;
    services: WebsiteService[];
    faq: WebsiteFaq[];
    ctaText: string | null;
  };
};

export async function getPublishedWebsiteBySlug(slug: string): Promise<PublicWebsiteView | null> {
  const db = await getDb();
  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  const org = orgRows[0];
  if (!org) return null;
  const siteRows = await db.select().from(websites).where(eq(websites.orgId, org.id)).limit(1);
  const site = siteRows[0];
  if (!site || !site.published) return null;
  return {
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
      id: site.id,
      template: site.template,
      heroHeadline: site.heroHeadline,
      heroSubtext: site.heroSubtext,
      aboutText: site.aboutText,
      services: (site.services as WebsiteService[] | null) ?? [],
      faq: (site.faq as WebsiteFaq[] | null) ?? [],
      ctaText: site.ctaText,
    },
  };
}
