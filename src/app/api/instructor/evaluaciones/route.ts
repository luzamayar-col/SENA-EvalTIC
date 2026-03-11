import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

const crearEvaluacionSchema = z.object({
  nombre: z.string().min(3, "Nombre muy corto").max(200),
  descripcion: z.string().max(500).optional(),
  competencia: z.string().min(3, "Competencia muy corta").max(300),
  codigoCompetencia: z.string().min(1, "Código de competencia requerido").max(20),
  resultadoAprendizaje: z.string().min(3, "Resultado de aprendizaje muy corto").max(500),
  codigoRA: z.string().min(1, "Código RA requerido").max(20),
  preguntas: z.array(z.unknown()).min(1, "Debes cargar el banco de preguntas"),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
  maxIntentos: z.number().int().min(1).max(10).optional(),
});

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
    const rawBody = await req.json();

    const parsed = crearEvaluacionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

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
    } = parsed.data;

    const evaluacion = await prisma.evaluacion.create({
      data: {
        nombre,
        descripcion: descripcion ?? null,
        competencia,
        codigoCompetencia,
        resultadoAprendizaje,
        codigoRA,
        preguntas: preguntas as Prisma.InputJsonValue,
        activa: false,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        config: (config ?? {
          timeLimitMinutes: 15,
          passingScorePercentage: 65,
          distribucionPreguntas: { seleccion_unica: 5, seleccion_multiple: 3, emparejamiento: 2 },
          aleatorizarOpciones: true,
        }) as Prisma.InputJsonValue,
        maxIntentos: maxIntentos ?? 1,
        instructorId: session.user.instructorId,
      },
    });

    return NextResponse.json(evaluacion, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear la evaluación" }, { status: 500 });
  }
}
