import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("db", () => {
  it("constructs a PrismaClient without connecting", () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
  });
});
