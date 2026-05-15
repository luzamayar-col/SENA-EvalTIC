import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

interface Params {
  params: Promise<{ id: string }>;
}

const editarFichaSchema = z.object({
  numero: z.string().min(1).max(20).optional(),
  programa: z.string().min(3).max(300).optional(),
  descripcion: z.string().max(500).optional().nullable(),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
});

async function getFichaOrFail(id: string, instructorId: string) {
  return prisma.ficha.findFirst({
    where: {
      id,
      evaluacion: { instructorId },
    },
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();
    const { id } = await params;

    const existing = await getFichaOrFail(id, session.user.instructorId);
    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const rawBody = await req.json();
    const parsed = editarFichaSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { numero, programa, descripcion, fechaInicio, fechaFin } = parsed.data;

    const updated = await prisma.ficha.update({
      where: { id },
      data: {
        ...(numero && { numero }),
        ...(programa && { programa }),
        descripcion: descripcion ?? null,
        fechaInicio: fechaInicio !== undefined ? (fechaInicio ? new Date(fechaInicio) : null) : undefined,
        fechaFin: fechaFin !== undefined ? (fechaFin ? new Date(fechaFin) : null) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar la ficha" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();
    const { id } = await params;

    const existing = await getFichaOrFail(id, session.user.instructorId);
    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    await prisma.ficha.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar la ficha" }, { status: 500 });
  }
}
