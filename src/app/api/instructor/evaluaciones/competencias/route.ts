import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

export async function GET() {
  const session = await requireInstructor();
  const instructorId = session.user.instructorId;

  const evaluaciones = await prisma.evaluacion.findMany({
    where: { instructorId },
    select: {
      codigoCompetencia: true,
      competencia: true,
      codigoRA: true,
      resultadoAprendizaje: true,
    },
  });

  // Deduplicar por código
  const competenciasMap = new Map<string, { codigo: string; nombre: string }>();
  const resultadosMap   = new Map<string, { codigo: string; nombre: string }>();

  for (const ev of evaluaciones) {
    if (ev.codigoCompetencia && ev.competencia) {
      competenciasMap.set(ev.codigoCompetencia, {
        codigo: ev.codigoCompetencia,
        nombre: ev.competencia,
      });
    }
    if (ev.codigoRA && ev.resultadoAprendizaje) {
      resultadosMap.set(ev.codigoRA, {
        codigo: ev.codigoRA,
        nombre: ev.resultadoAprendizaje,
      });
    }
  }

  return NextResponse.json({
    competencias: Array.from(competenciasMap.values()),
    resultados:   Array.from(resultadosMap.values()),
  });
}
