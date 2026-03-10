import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Rutas de instructor que NO requieren autenticación
const PUBLIC_INSTRUCTOR_PATHS = ["/instructor/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir la página de login y sus assets
  if (PUBLIC_INSTRUCTOR_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Todas las rutas /instructor/* requieren JWT válido
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/instructor/login", request.url);
    // Guardar la URL original para redirigir después del login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Aplicar solo a rutas del instructor (excluye API routes — esas validan con requireInstructor())
export const config = {
  matcher: ["/instructor/:path*"],
};
