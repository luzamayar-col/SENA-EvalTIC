import type { NextConfig } from "next";

const securityHeaders = [
  // Fuerza HTTPS durante 2 años, incluye subdominios
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Evita clickjacking — solo permite iframes del mismo origen
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Desactiva MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Protección legacy XSS en navegadores antiguos
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Limita info del Referer header
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restringe acceso a APIs de hardware innecesarias
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // CSP: limita orígenes de carga de recursos
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js/React requieren unsafe-inline y unsafe-eval (RSC, hot reload)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Fetch/XHR solo al mismo origen
      "connect-src 'self'",
      // Bloquea embeber la app en iframes de terceros
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Evita que Prisma Client sea empaquetado por el bundler de Next.js en Vercel.
  // Prisma 7 genera el cliente en src/generated/prisma; el bundler debe excluirlo.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
