// Carga .env.local (donde están los secrets) para que el CLI de Prisma los lea.
// dotenv/config por defecto carga .env; aquí lo redirigimos a .env.local.
import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Para migraciones usa DATABASE_URL (configura la URL directa de Neon en .env.local)
    // En producción (Vercel), el adapter PrismaNeonHttp maneja el routing.
    url: process.env.DATABASE_URL!,
  },
});
