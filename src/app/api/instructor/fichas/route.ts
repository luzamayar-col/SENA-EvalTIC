import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

const crearFichaSchema = z.object({
  numero: z.string().min(1, "Número de ficha requerido").max(20),
  programa: z.string().min(3, "Nombre de programa muy corto").max(300),
  descripcion: z.string().max(500).optional(),
  evaluacionId: z.string().min(1, "evaluacionId requerido").max(100),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireInstructor();
    const { searchParams } = new URL(req.url);
    const evaluacionId = searchParams.get("evaluacionId");

    const fichas = await prisma.ficha.findMany({
      where: {
        evaluacion: { instructorId: session.user.instructorId },
        ...(evaluacionId ? { evaluacionId } : {}),
      },
      include: {
        evaluacion: { select: { id: true, nombre: true } },
        _count: { select: { resultados: true } },
      },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json(fichas);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireInstructor();
    const rawBody = await req.json();

    const parsed = crearFichaSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { numero, programa, descripcion, evaluacionId, fechaInicio, fechaFin } = parsed.data;

    // Verificar que la evaluación pertenece al instructor
    const evaluacion = await prisma.evaluacion.findFirst({
      where: { id: evaluacionId, instructorId: session.user.instructorId },
    });

    if (!evaluacion) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }

    const ficha = await prisma.ficha.create({
      data: {
        numero,
        programa,
        descripcion: descripcion ?? null,
        evaluacionId,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
      },
    });

    return NextResponse.json(ficha, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una ficha con ese número para esta evaluación" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Error al crear la ficha" }, { status: 500 });
  }
}
