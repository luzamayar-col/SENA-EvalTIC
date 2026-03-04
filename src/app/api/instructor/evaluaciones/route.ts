import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

export async function GET() {
  try {
    const session = await requireInstructor();

    const evaluaciones = await prisma.evaluacion.findMany({
      where: { instructorId: session.user.instructorId },
      include: {
        _count: { select: { fichas: true, resultados: true } },
      },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json(evaluaciones);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireInstructor();
    const body = await req.json();

    const {
      nombre,
      descripcion,
      competencia,
      codigoCompetencia,
      resultadoAprendizaje,
      codigoRA,
      preguntas,
      fechaInicio,
      fechaFin,
      config,
      maxIntentos,
    } = body;

    if (!nombre || !competencia || !codigoCompetencia || !resultadoAprendizaje || !codigoRA) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (!preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
      return NextResponse.json(
        { error: "Debes cargar el banco de preguntas (archivo JSON)" },
        { status: 400 },
      );
    }

    const evaluacion = await prisma.evaluacion.create({
      data: {
        nombre,
        descripcion: descripcion ?? null,
        competencia,
        codigoCompetencia,
        resultadoAprendizaje,
        codigoRA,
        preguntas,
        activa: false,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        config: config ?? {
          timeLimitMinutes: 15,
          passingScorePercentage: 65,
          distribucionPreguntas: { seleccion_unica: 5, seleccion_multiple: 3, emparejamiento: 2 },
          aleatorizarOpciones: true,
        },
        maxIntentos: typeof maxIntentos === "number" && maxIntentos >= 1 ? maxIntentos : 1,
        instructorId: session.user.instructorId,
      },
    });

    return NextResponse.json(evaluacion, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear la evaluación" }, { status: 500 });
  }
}
