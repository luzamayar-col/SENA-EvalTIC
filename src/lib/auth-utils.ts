import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Verifica que el usuario tenga sesión activa como instructor.
 * Si no tiene sesión, redirige a /instructor/login.
 * Usar en Server Components y API Routes.
 */
export async function requireInstructor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.instructorId) {
    redirect("/instructor/login");
  }
  return session;
}

/**
 * Verifica sesión en API Routes (retorna null en lugar de redirigir).
 * Usar cuando se quiere manejar el error manualmente con Response 401.
 */
export async function getInstructorSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.instructorId) return null;
  return session;
}
