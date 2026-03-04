import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

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
    const body = await req.json();

    const { numero, programa, descripcion, evaluacionId } = body;

    if (!numero || !programa || !evaluacionId) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    // Verify the evaluacion belongs to this instructor
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
      },
    });

    return NextResponse.json(ficha, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint violation (numero + evaluacionId)
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
