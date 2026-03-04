import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

export async function GET() {
  try {
    const session = await requireInstructor();
    const instructorId = session.user.instructorId;

    const [totalResultados, aprobados, resultadosPuntaje, evaluacionesActivas] =
      await Promise.all([
        prisma.resultado.count({
          where: { evaluacion: { instructorId } },
        }),
        prisma.resultado.count({
          where: { evaluacion: { instructorId }, aprobado: true },
        }),
        prisma.resultado.findMany({
          where: { evaluacion: { instructorId } },
          select: { puntaje: true },
        }),
        prisma.evaluacion.count({
          where: { instructorId, activa: true },
        }),
      ]);

    const tasaAprobacion =
      totalResultados > 0 ? Math.round((aprobados / totalResultados) * 100) : 0;

    const promedioGlobal =
      resultadosPuntaje.length > 0
        ? Math.round(
            resultadosPuntaje.reduce((acc, r) => acc + r.puntaje, 0) /
              resultadosPuntaje.length,
          )
        : 0;

    return NextResponse.json({
      totalResultados,
      tasaAprobacion,
      promedioGlobal,
      evaluacionesActivas,
    });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
