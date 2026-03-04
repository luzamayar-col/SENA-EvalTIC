import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_CONFIG } from "@/lib/config";

/**
 * Public endpoint — lets a student download their own result PDF.
 * Security: the cedula query param must match the resultado's cedula.
 * GET /api/evaluacion/pdf-resultado/[id]?cedula=...
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cedula = req.nextUrl.searchParams.get("cedula");

  if (!cedula) {
    return NextResponse.json({ error: "Cédula requerida" }, { status: 400 });
  }

  const resultado = await prisma.resultado.findFirst({
    where: { id, cedula, esPrueba: false },
    include: {
      evaluacion: {
        select: { preguntas: true, config: true },
      },
    },
  });

  if (!resultado) {
    return NextResponse.json({ error: "Resultado no encontrado" }, { status: 404 });
  }

  const respuestasMap = resultado.respuestas as Record<string, unknown>;
  const idsRespondidos = Object.keys(respuestasMap);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todasPreguntas = resultado.evaluacion.preguntas as any[];
  const preguntasEvaluadas = todasPreguntas.filter((q) =>
    idsRespondidos.includes(String(q.id)),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const passingScore =
    (resultado.evaluacion.config as any)?.passingScorePercentage ??
    APP_CONFIG.passingScorePercentage;

  return NextResponse.json({
    resultado: {
      cedula: resultado.cedula,
      tipoDocumento: resultado.tipoDocumento,
      nombres: resultado.nombres,
      apellidos: resultado.apellidos,
      email: resultado.email,
      puntaje: resultado.puntaje,
      aprobado: resultado.aprobado,
      preguntasCorrectas: resultado.preguntasCorrectas,
      totalPreguntas: resultado.totalPreguntas,
      tiempoUsado: resultado.tiempoUsado,
      intento: resultado.intento,
      presentadoEn: resultado.presentadoEn.toISOString(),
      respuestas: resultado.respuestas,
    },
    preguntas: preguntasEvaluadas,
    passingScore,
  });
}
