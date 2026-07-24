// Lead Machine — Drizzle database client.
//
// BUILD RESILIENCE (non-negotiable): the build MUST pass with ZERO environment
// variables. The exported `db` is therefore NULLABLE:
//   - When DATABASE_URL is a postgres URL  → Neon HTTP drizzle client (production)
//   - When DATABASE_URL is absent AND not in a production build → PGlite dev
//     fallback (in-process Postgres, same pgTable schema) so the local demo
//     keeps working with no env vars.
//   - Otherwise (production build, no DATABASE_URL) → null
//
// Every service guards with: if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
//
// PGlite is a dev-only convenience. In production on Vercel, set DATABASE_URL to
// a Neon connection string and the PGlite branch never executes.
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "./schema";

export type DbClient = ReturnType<typeof drizzleNeon<typeof schema.schema>>;

const DATABASE_URL = process.env.DATABASE_URL;
const IS_PROD_BUILD =
  process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-server";

function isPostgresUrl(v: string): boolean {
  return /^postgres(ql)?:\/\//i.test(v);
}

// Production / explicit-Neon path: real DATABASE_URL → Neon HTTP client.
function createNeonClient(url: string): DbClient {
  return drizzleNeon(neon(url), { schema: schema.schema });
}

// Dev fallback: in-process Postgres (PGlite) persisted to a local directory.
// Lazy + cached so we never construct it at build time or more than once.
let pgliteClientPromise: Promise<DbClient> | null = null;
async function createPgliteClient(): Promise<DbClient> {
  if (!pgliteClientPromise) {
    pgliteClientPromise = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const { drizzle } = await import("drizzle-orm/pglite");
      const path = await import("node:path");
      const fs = await import("node:fs");
      const dbDir = path.join(process.cwd(), "db", "pglite");
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
        /* ignore */
      }
      const pg = new PGlite(dbDir);
      const db = drizzle(pg, { schema: schema.schema });
      // Auto-create tables from the schema on first dev boot.
      await ensureSchema(db);
      return db as unknown as DbClient;
    })();
  }
  return pgliteClientPromise;
}

async function ensureSchema(db: any): Promise<void> {
  // Idempotent CREATE TABLE statements matching schema.ts. Using IF NOT EXISTS
  // so this is safe to run on every dev boot.
  const stmts = [
    // Note: PGlite has gen_random_uuid() built in; no pgcrypto extension needed.
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" varchar(255) NOT NULL UNIQUE,
      "name" varchar(120),
      "password_hash" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "organizations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(160) NOT NULL,
      "slug" varchar(100) NOT NULL UNIQUE,
      "industry" varchar(60) NOT NULL,
      "services" text,
      "logo_url" varchar(500),
      "primary_color" varchar(9) NOT NULL DEFAULT '#059669',
      "whatsapp_number" varchar(30),
      "whatsapp_connected" boolean NOT NULL DEFAULT false,
      "owner_phone" varchar(30),
      "plan" varchar(20) NOT NULL DEFAULT 'trial',
      "trial_ends_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade
    )`,
    `CREATE TABLE IF NOT EXISTS "memberships" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "role" varchar(20) NOT NULL DEFAULT 'owner',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "memberships_org_user_uniq" ON "memberships" ("org_id", "user_id")`,
    `CREATE INDEX IF NOT EXISTS "memberships_org_id_idx" ON "memberships" ("org_id")`,
    `CREATE INDEX IF NOT EXISTS "memberships_user_id_idx" ON "memberships" ("user_id")`,
    `CREATE TABLE IF NOT EXISTS "leads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
      "name" varchar(160) NOT NULL,
      "phone" varchar(30) NOT NULL,
      "email" varchar(255),
      "service_needed" varchar(255),
      "message" text,
      "source" varchar(50) NOT NULL DEFAULT 'website',
      "ai_score" integer,
      "ai_temperature" varchar(10),
      "ai_reason" text,
      "status" varchar(20) NOT NULL DEFAULT 'new',
      "whatsapp_sent" boolean NOT NULL DEFAULT false,
      "owner_notified" boolean NOT NULL DEFAULT false,
      "consent_given" boolean NOT NULL DEFAULT false,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "leads_org_id_idx" ON "leads" ("org_id")`,
    `CREATE INDEX IF NOT EXISTS "leads_org_id_status_idx" ON "leads" ("org_id", "status")`,
    `CREATE INDEX IF NOT EXISTS "leads_org_id_temp_idx" ON "leads" ("org_id", "ai_temperature")`,
    `CREATE TABLE IF NOT EXISTS "websites" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE cascade,
      "template" varchar(40) NOT NULL DEFAULT 'professional',
      "hero_headline" text,
      "hero_subtext" text,
      "about_text" text,
      "services" jsonb,
      "faq" jsonb,
      "cta_text" varchar(100),
      "published" boolean NOT NULL DEFAULT false,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
      "lead_id" uuid REFERENCES "leads"("id") ON DELETE set null,
      "direction" varchar(10) NOT NULL,
      "phone_number" varchar(30) NOT NULL,
      "content" text NOT NULL,
      "message_type" varchar(20) NOT NULL DEFAULT 'text',
      "status" varchar(20) NOT NULL DEFAULT 'sent',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "whatsapp_messages_org_id_idx" ON "whatsapp_messages" ("org_id")`,
    `CREATE INDEX IF NOT EXISTS "whatsapp_messages_lead_id_idx" ON "whatsapp_messages" ("lead_id")`,
    `CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE cascade,
      "plan" varchar(20) NOT NULL DEFAULT 'trial',
      "amount_zar" integer NOT NULL DEFAULT 0,
      "status" varchar(20) NOT NULL DEFAULT 'trial',
      "current_period_start" timestamptz,
      "current_period_end" timestamptz,
      "cancelled_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid REFERENCES "organizations"("id") ON DELETE cascade,
      "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
      "event_type" varchar(80) NOT NULL,
      "payload" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "events_org_id_idx" ON "events" ("org_id")`,
    `CREATE INDEX IF NOT EXISTS "events_event_type_idx" ON "events" ("event_type")`,
    `CREATE INDEX IF NOT EXISTS "events_created_at_idx" ON "events" ("created_at")`,
  ];
  for (const s of stmts) {
    try {
      await db.execute(s);
    } catch (e) {
      console.error("[db:pglite:init] statement failed:", s, (e as Error)?.message);
    }
  }
}

// Synchronous export used by services. Null when there's no Neon URL AND we're
// in a production build (so the build makes zero DB calls).
export const db: DbClient | null = DATABASE_URL
  ? isPostgresUrl(DATABASE_URL)
    ? createNeonClient(DATABASE_URL)
    : null
  : IS_PROD_BUILD
  ? null
  : null; // dev with no DATABASE_URL → resolved lazily via getDb() below

// Services call getDb() to obtain a client. Resolution rules:
//   - DATABASE_URL is a postgres URL → Neon HTTP client (production)
//   - DATABASE_URL is absent OR not a postgres URL (e.g. a stale `file:` value)
//     AND not a production build → PGlite dev fallback
//   - otherwise (production build, no usable URL) → throw DATABASE_NOT_CONFIGURED
export async function getDb(): Promise<DbClient> {
  if (DATABASE_URL && isPostgresUrl(DATABASE_URL)) {
    return db as DbClient;
  }
  if (!IS_PROD_BUILD) {
    // Dev: no DATABASE_URL, or a non-postgres DATABASE_URL (e.g. legacy file: path).
    return createPgliteClient();
  }
  throw new Error("DATABASE_NOT_CONFIGURED");
}

// Synchronous guard for code paths that already hold a `db` reference.
export function requireDb(): DbClient {
  if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  return db;
}

export { schema };
