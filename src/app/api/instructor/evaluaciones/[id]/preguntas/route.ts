import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const evaluacion = await prisma.evaluacion.findFirst({
    where: { id, instructorId: session.user.instructorId },
    select: { nombre: true, preguntas: true },
  });

  if (!evaluacion) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  // Exportar en el formato establecido (texto, no enunciado)
  const preguntas = (evaluacion.preguntas as any[]).map((p: any) => {
    const { enunciado, ...rest } = p;
    return { ...rest, texto: enunciado ?? p.texto ?? "" };
  });

  const filename = `banco-preguntas-${evaluacion.nombre
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50)}.json`;

  return new NextResponse(JSON.stringify({ preguntas }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
