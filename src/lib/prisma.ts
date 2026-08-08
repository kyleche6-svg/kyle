import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // Default pg.Pool settings assume a long-lived local process — against a
  // remote managed Postgres from a serverless function, idle pooled
  // connections get silently killed by the network/server between
  // requests, and the next query on that stale connection throws
  // "Connection terminated unexpectedly" instead of reconnecting.
  // Confirmed live on the production deploy. A short idle timeout makes
  // the pool proactively recycle connections before they go stale, and a
  // small max pool size matches a serverless function handling one
  // request at a time (no benefit to a large per-instance pool).
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
