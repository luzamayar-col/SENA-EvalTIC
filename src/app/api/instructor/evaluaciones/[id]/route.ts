import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

interface Params {
  params: Promise<{ id: string }>;
}

const editarEvaluacionSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  descripcion: z.string().max(500).optional().nullable(),
  competencia: z.string().min(3).max(300).optional(),
  codigoCompetencia: z.string().min(1).max(20).optional(),
  resultadoAprendizaje: z.string().min(3).max(500).optional(),
  codigoRA: z.string().min(1).max(20).optional(),
  preguntas: z.array(z.unknown()).optional(),
  fechaInicio: z.string().datetime({ offset: true }).optional().nullable(),
  fechaFin: z.string().datetime({ offset: true }).optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
  maxIntentos: z.number().int().min(1).max(10).optional(),
});

async function getEvaluacionOrFail(id: string, instructorId: string) {
  const ev = await prisma.evaluacion.findFirst({
    where: { id, instructorId },
  });
  return ev;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();
    const { id } = await params;

    const evaluacion = await getEvaluacionOrFail(id, session.user.instructorId);
    if (!evaluacion) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json(evaluacion);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();
    const { id } = await params;

    const existing = await getEvaluacionOrFail(id, session.user.instructorId);
    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const rawBody = await req.json();
    const parsed = editarEvaluacionSchema.safeParse(rawBody);
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

    const updated = await prisma.evaluacion.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        descripcion: descripcion ?? null,
        ...(competencia && { competencia }),
        ...(codigoCompetencia && { codigoCompetencia }),
        ...(resultadoAprendizaje && { resultadoAprendizaje }),
        ...(codigoRA && { codigoRA }),
        ...(preguntas && { preguntas }),
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        ...(config && { config }),
        ...(typeof maxIntentos === "number" ? { maxIntentos } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar la evaluación" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();
    const { id } = await params;

    const existing = await getEvaluacionOrFail(id, session.user.instructorId);
    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    await prisma.evaluacion.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar la evaluación" }, { status: 500 });
  }
}
