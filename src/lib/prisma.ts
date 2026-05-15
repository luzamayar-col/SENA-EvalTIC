import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Prisma 7 requires adapter — cannot instantiate without one.
    // Return a proxy that defers the error to actual usage (safe for module evaluation at build time).
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("DATABASE_URL is not set — PrismaClient is unavailable");
      },
    });
  }

  // PrismaNeonHttp usa el protocolo HTTP de Neon, ideal para serverless (Vercel)
  const adapter = new PrismaNeonHttp(connectionString, {});

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
