import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

interface Params {
  params: Promise<{ id: string }>;
}

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
        ...(typeof maxIntentos === "number" && maxIntentos >= 1 ? { maxIntentos } : {}),
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
