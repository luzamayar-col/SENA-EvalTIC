import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();
    const { id } = await params;

    // Verify ownership via evaluacion
    const ficha = await prisma.ficha.findFirst({
      where: { id, evaluacion: { instructorId: session.user.instructorId } },
      select: { id: true, activa: true },
    });

    if (!ficha) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const updated = await prisma.ficha.update({
      where: { id },
      data: { activa: !ficha.activa },
      select: { id: true, activa: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar la ficha" }, { status: 500 });
  }
}
