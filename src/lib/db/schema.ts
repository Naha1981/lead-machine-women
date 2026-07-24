// Lead Machine — Drizzle schema (Postgres, shared by Neon + PGlite dev).
// Re-expresses the previous Prisma schema 1:1 with pgTable.
// TS property names are camelCase (matching the old Prisma field names so
// service return shapes stay identical); DB column names are snake_case.
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- users ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- organizations ----------
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  industry: varchar("industry", { length: 60 }).notNull(),
  services: text("services"),
  logoUrl: varchar("logo_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 9 }).default("#059669").notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 30 }),
  whatsappConnected: boolean("whatsapp_connected").default(false).notNull(),
  ownerPhone: varchar("owner_phone", { length: 30 }),
  plan: varchar("plan", { length: 20 }).default("trial").notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// ---------- memberships ----------
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("owner").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // one membership per (org, user) — unique index, not a composite PK (id is the PK)
    orgUserUniq: uniqueIndex("memberships_org_user_uniq").on(t.orgId, t.userId),
    orgIdx: index("memberships_org_id_idx").on(t.orgId),
    userIdx: index("memberships_user_id_idx").on(t.userId),
  })
);

// ---------- leads ----------
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    serviceNeeded: varchar("service_needed", { length: 255 }),
    message: text("message"),
    source: varchar("source", { length: 50 }).default("website").notNull(),
    aiScore: integer("ai_score"), // 1-10
    aiTemperature: varchar("ai_temperature", { length: 10 }), // hot|warm|cold
    aiReason: text("ai_reason"),
    status: varchar("status", { length: 20 }).default("new").notNull(),
    whatsappSent: boolean("whatsapp_sent").default(false).notNull(),
    ownerNotified: boolean("owner_notified").default(false).notNull(),
    consentGiven: boolean("consent_given").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("leads_org_id_idx").on(t.orgId),
    orgStatusIdx: index("leads_org_id_status_idx").on(t.orgId, t.status),
    orgTempIdx: index("leads_org_id_temp_idx").on(t.orgId, t.aiTemperature),
  })
);

// ---------- websites ----------
export const websites = pgTable("websites", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  template: varchar("template", { length: 40 }).default("professional").notNull(),
  heroHeadline: text("hero_headline"),
  heroSubtext: text("hero_subtext"),
  aboutText: text("about_text"),
  // jsonb — stored as objects, retrieved as objects (previously JSON strings in Prisma).
  services: jsonb("services").$type<{ name: string; description: string }[]>(),
  faq: jsonb("faq").$type<{ question: string; answer: string }[]>(),
  ctaText: varchar("cta_text", { length: 100 }),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- whatsapp_messages ----------
export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    direction: varchar("direction", { length: 10 }).notNull(), // inbound|outbound
    phoneNumber: varchar("phone_number", { length: 30 }).notNull(),
    content: text("content").notNull(),
    messageType: varchar("message_type", { length: 20 }).default("text").notNull(),
    status: varchar("status", { length: 20 }).default("sent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("whatsapp_messages_org_id_idx").on(t.orgId),
    leadIdx: index("whatsapp_messages_lead_id_idx").on(t.leadId),
  })
);

// ---------- subscriptions ----------
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 20 }).default("trial").notNull(),
  amountZar: integer("amount_zar").default(0).notNull(), // cents
  status: varchar("status", { length: 20 }).default("trial").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- events (NEW — event-driven standard) ----------
// Every significant action emits a row here. orgId is nullable for user-level
// events (e.g. user.signed_up before an org exists).
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("events_org_id_idx").on(t.orgId),
    typeIdx: index("events_event_type_idx").on(t.eventType),
    createdAtIdx: index("events_created_at_idx").on(t.createdAt),
  })
);

export type DbUser = typeof users.$inferSelect;
export type DbOrganization = typeof organizations.$inferSelect;
export type DbMembership = typeof memberships.$inferSelect;
export type DbLead = typeof leads.$inferSelect;
export type DbWebsite = typeof websites.$inferSelect;
export type DbWhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type DbSubscription = typeof subscriptions.$inferSelect;
export type DbEvent = typeof events.$inferSelect;

export const schema = {
  users,
  organizations,
  memberships,
  leads,
  websites,
  whatsappMessages,
  subscriptions,
  events,
};
