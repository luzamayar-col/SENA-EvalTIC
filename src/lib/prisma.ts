import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Sin DATABASE_URL — el cliente fallará en runtime si se usa;
    // comportamiento esperado en builds de CI sin DB.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({} as any);
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
