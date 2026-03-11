import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { APP_CONFIG } from "@/lib/config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireInstructor();
  const { id } = await params;

  const resultado = await prisma.resultado.findFirst({
    where: {
      id,
      evaluacion: { instructorId: session.user.instructorId },
    },
    include: {
      evaluacion: {
        select: {
          preguntas: true,
          config: true,
        },
      },
    },
  });

  if (!resultado) {
    return NextResponse.json({ error: "Resultado no encontrado" }, { status: 404 });
  }

  // Filter the full question bank to only the answered questions
  const respuestasMap = resultado.respuestas as Record<string, unknown>;
  const idsRespondidos = Object.keys(respuestasMap);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todasPreguntas = resultado.evaluacion.preguntas as any[];
  const preguntasEvaluadas = todasPreguntas.filter((q) =>
    idsRespondidos.includes(String(q.id)),
  );

  const passingScore =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      incidenciasAntiplagio: resultado.incidenciasAntiplagio,
    },
    preguntas: preguntasEvaluadas,
    passingScore,
  });
}
