import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Runtime queries always go through the pooled DATABASE_URL (Supabase pgbouncer,
// port 6543) — this is what scales under Vercel's serverless functions. Prisma
// Migrate uses a separate, direct connection configured in prisma.config.ts instead.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
