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
//
// NOTE: Neon + PGlite imports are LAZY (dynamic import inside functions) to
// avoid module-level side effects that break in Next.js RSC (Server Component)
// contexts with Turbopack.

import { sql } from "drizzle-orm";
import * as schema from "./schema";

// We use `any` for the client type because the Neon and PGlite drizzle drivers
// have different types but the same query API. Services call getDb() which
// returns a unified client.
export type DbClient = any;

const DATABASE_URL = process.env.DATABASE_URL;
const IS_PROD_BUILD =
  process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-server";

function isPostgresUrl(v: string): boolean {
  return /^postgres(ql)?:\/\//i.test(v);
}

// Production / explicit-Neon path: real DATABASE_URL → Neon HTTP client.
// Lazy import to avoid module-level side effects in RSC.
async function createNeonClient(url: string): Promise<DbClient> {
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { neon } = await import("@neondatabase/serverless");
  return drizzle(neon(url), { schema: schema.schema });
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
      // Ensure dbDir is a plain string — process.cwd() can return a URL-like
      // object in some Next.js Turbopack RSC contexts, which breaks PGlite.
      const cwd = String(process.cwd());
      const dbDir = String(path.join(cwd, "db", "pglite"));
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
      "password_hash" text,
      "clerk_id" varchar(120),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
    // Phase 2 migration: add clerk_id column + make password_hash nullable for
    // existing PGlite databases created in Phase 1.
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_id" varchar(120)`,
    `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" ("clerk_id") WHERE "clerk_id" IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS "organizations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(160) NOT NULL,
      "slug" varchar(100) NOT NULL UNIQUE,
      "industry" varchar(60) NOT NULL,
      "services" text,
      "logo_url" varchar(500),
      "primary_color" varchar(9) NOT NULL DEFAULT '#059669',
      "whatsapp_number" varchar(30),
      "whatsapp_account_id" varchar(120),
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
      "opted_out_at" timestamptz,
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
      "provider" varchar(30) NOT NULL DEFAULT 'payfast',
      "provider_payment_id" varchar(120),
      "provider_token" varchar(160),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "follow_up_jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
      "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
      "channel" varchar(20) NOT NULL DEFAULT 'whatsapp',
      "message" text NOT NULL,
      "scheduled_at" timestamptz NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "attempts" integer NOT NULL DEFAULT 0,
      "last_attempt_at" timestamptz,
      "sent_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "follow_up_jobs_org_scheduled_idx" ON "follow_up_jobs" ("org_id", "scheduled_at")`,
    `CREATE INDEX IF NOT EXISTS "follow_up_jobs_status_scheduled_idx" ON "follow_up_jobs" ("status", "scheduled_at")`,
    `CREATE INDEX IF NOT EXISTS "follow_up_jobs_lead_id_idx" ON "follow_up_jobs" ("lead_id")`,
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
      await db.execute(sql.raw(s));
    } catch (e) {
      console.error("[db:pglite:init] statement failed:", s, (e as Error)?.message);
    }
  }
}

// The synchronous `db` export is always null in the new architecture —
// clients must use getDb() which lazily creates the appropriate client.
// This avoids any module-level DB client construction (build-safe with zero
// env vars) and avoids PGlite/Neon side effects in RSC.
export const db: DbClient | null = null;

// Cached Neon client promise (only created when DATABASE_URL is a postgres URL).
let neonClientPromise: Promise<DbClient> | null = null;

// Services call getDb() to obtain a client. Resolution rules:
//   - DATABASE_URL is a postgres URL → Neon HTTP client (production)
//   - DATABASE_URL is absent OR not a postgres URL (e.g. a stale `file:` value)
//     AND not a production build → PGlite dev fallback
//   - otherwise (production build, no usable URL) → throw DATABASE_NOT_CONFIGURED
export async function getDb(): Promise<DbClient> {
  if (DATABASE_URL && isPostgresUrl(DATABASE_URL)) {
    if (!neonClientPromise) {
      neonClientPromise = createNeonClient(DATABASE_URL);
    }
    return neonClientPromise;
  }
  if (!IS_PROD_BUILD) {
    // Dev: no DATABASE_URL, or a non-postgres DATABASE_URL (e.g. legacy file: path).
    return createPgliteClient();
  }
  throw new Error("DATABASE_NOT_CONFIGURED");
}

// Synchronous guard — always throws now since db is always null. Services
// should use getDb() instead. Kept for backward compat with any code that
// imports it.
export function requireDb(): DbClient {
  throw new Error("DATABASE_NOT_CONFIGURED — use getDb() instead");
}

export { schema };
