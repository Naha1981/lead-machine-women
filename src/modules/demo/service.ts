import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, memberships, users, websites } from "@/lib/db/schema";

async function ensureDemoDentistWebsite(orgId: string) {
  const db = await getDb();
  const existing = await db.select().from(websites).where(eq(websites.orgId, orgId)).limit(1);
  if (existing[0]) {
    if (!existing[0].published) {
      const rows = await db.update(websites)
        .set({ published: true, updatedAt: new Date() })
        .where(eq(websites.id, existing[0].id))
        .returning();
      return rows[0];
    }
    return existing[0];
  }

  const rows = await db.insert(websites).values({
    orgId,
    template: "professional",
    heroHeadline: "Dental care with a clear plan",
    heroSubtext: "Book a consultation with a trusted Sandton dental team.",
    aboutText: "Sandton Smile Dental helps patients with general, cosmetic and emergency dental care.",
    services: [
      { name: "Dental implants", description: "Implant consultations and treatment planning." },
      { name: "General dentistry", description: "Routine dental care and oral health support." },
      { name: "Cosmetic dentistry", description: "Smile-focused cosmetic treatments." },
      { name: "Emergency dental care", description: "Rapid support for urgent dental problems." },
    ],
    faq: [
      { question: "How do I book?", answer: "Submit the enquiry form and the team will contact you." },
      { question: "Do you handle dental emergencies?", answer: "Yes. Tell us what is happening and we will advise on the next step." },
    ],
    ctaText: "Request consultation",
    published: true,
  }).returning();

  return rows[0];
}

export async function ensureDemoDentistOrg() {
  if (process.env.ENABLE_DEMO_MODE !== "true") throw new Error("Demo mode disabled");
  const db = await getDb();

  const existing = await db.select().from(organizations).where(eq(organizations.slug, "sandton-smile-dental")).limit(1);
  if (existing[0]) {
    await ensureDemoDentistWebsite(existing[0].id);
    return existing[0];
  }

  const existingUser = await db.select().from(users).where(eq(users.email, "demo-dentist@nahalabs.local")).limit(1);
  let owner = existingUser[0];
  if (!owner) {
    const rows = await db.insert(users).values({
      email: "demo-dentist@nahalabs.local",
      name: "Dr. Demo Dentist",
    }).returning();
    owner = rows[0];
  }

  const orgRows = await db.insert(organizations).values({
    name: "Sandton Smile Dental",
    slug: "sandton-smile-dental",
    industry: "healthcare",
    services: "Dental implants\nGeneral dentistry\nCosmetic dentistry\nEmergency dental care",
    primaryColor: "#0f766e",
    ownerPhone: "+27820000000",
    whatsappNumber: "+27820000000",
    plan: "trial",
    ownerId: owner.id,
  }).returning();

  await db.insert(memberships).values({ orgId: orgRows[0].id, userId: owner.id, role: "owner" });
  await ensureDemoDentistWebsite(orgRows[0].id);
  return orgRows[0];
}
