import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Used only by the Prisma CLI (migrate, studio, generate) — must be the direct,
// non-pooled connection. Supabase's pgbouncer pooler (DATABASE_URL) doesn't support
// the session-level features Prisma Migrate needs. The app's runtime PrismaClient
// (lib/db.ts) uses the pooled DATABASE_URL instead, via a driver adapter — it does
// not read this config.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
