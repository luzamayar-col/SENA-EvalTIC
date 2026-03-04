import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

interface Params {
  params: Promise<{ id: string }>;
}

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

    const body = await req.json();
    const { numero, programa, descripcion } = body;

    const updated = await prisma.ficha.update({
      where: { id },
      data: {
        ...(numero && { numero }),
        ...(programa && { programa }),
        descripcion: descripcion ?? null,
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
