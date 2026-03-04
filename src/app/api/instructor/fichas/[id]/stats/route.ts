import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const ficha = await prisma.ficha.findFirst({
    where: { id, evaluacion: { instructorId: session.user.instructorId } },
    select: {
      id: true,
      numero: true,
      programa: true,
      activa: true,
      evaluacion: {
        select: {
          id: true,
          nombre: true,
          competencia: true,
          maxIntentos: true,
          activa: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
  });

  if (!ficha) {
    return NextResponse.json({ error: "Ficha no encontrada" }, { status: 404 });
  }

  const [totalAprendices, resultados] = await Promise.all([
    prisma.aprendiz.count({ where: { fichaId: id } }),
    prisma.resultado.findMany({
      where: { fichaId: id, esPrueba: false },
      select: { cedula: true, puntaje: true, aprobado: true },
    }),
  ]);

  const totalPresentaciones = resultados.length;

  // Distinct cedulas con al menos 1 aprobado
  const aprobadosPorCedula = new Set(
    resultados.filter((r) => r.aprobado).map((r) => r.cedula)
  );
  const aprendicesAprobados = aprobadosPorCedula.size;

  const tasaAprobacion =
    totalPresentaciones > 0
      ? Math.round((resultados.filter((r) => r.aprobado).length / totalPresentaciones) * 100)
      : 0;

  const promedioPuntaje =
    totalPresentaciones > 0
      ? Math.round(
          resultados.reduce((acc, r) => acc + r.puntaje, 0) / totalPresentaciones
        )
      : 0;

  return NextResponse.json({
    totalAprendices,
    totalPresentaciones,
    aprendicesAprobados,
    tasaAprobacion,
    promedioPuntaje,
    evaluacion: {
      id: ficha.evaluacion.id,
      nombre: ficha.evaluacion.nombre,
      competencia: ficha.evaluacion.competencia,
      maxIntentos: ficha.evaluacion.maxIntentos,
      activa: ficha.evaluacion.activa,
      fechaInicio: ficha.evaluacion.fechaInicio?.toISOString() ?? null,
      fechaFin: ficha.evaluacion.fechaFin?.toISOString() ?? null,
    },
  });
}
