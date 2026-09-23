import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, memberships, users } from "@/lib/db/schema";

export async function ensureDemoDentistOrg() {
  if (process.env.ENABLE_DEMO_MODE !== "true") throw new Error("Demo mode disabled");
  const db = await getDb();

  const existing = await db.select().from(organizations).where(eq(organizations.slug, "sandton-smile-dental")).limit(1);
  if (existing[0]) return existing[0];

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
  return orgRows[0];
}
