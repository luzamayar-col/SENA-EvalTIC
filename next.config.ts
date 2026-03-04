import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Prisma Client sea empaquetado por el bundler de Next.js en Vercel.
  // Prisma 7 genera el cliente en src/generated/prisma; el bundler debe excluirlo.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
