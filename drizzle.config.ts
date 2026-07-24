// Lead Machine — Drizzle Kit config.
// `drizzle-kit push` syncs src/lib/db/schema.ts to the database.
//
// For local dev (PGlite), there's nothing to push — the app auto-creates tables
// on boot via ensureSchema() in src/lib/db/index.ts. drizzle-kit push is mainly
// used against a real Postgres/Neon DATABASE_URL in CI/deploy.
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: url
    ? { url }
    : {
        // No DATABASE_URL → use the local PGlite file so `drizzle-kit push`
        // works in dev without an external DB.
        url: "file:./db/pglite",
      },
  verbose: true,
  strict: true,
});
