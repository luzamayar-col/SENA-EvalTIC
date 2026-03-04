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

    const existing = await prisma.evaluacion.findFirst({
      where: { id, instructorId: session.user.instructorId },
    });

    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const updated = await prisma.evaluacion.update({
      where: { id },
      data: { activa: !existing.activa },
    });

    return NextResponse.json({ activa: updated.activa });
  } catch {
    return NextResponse.json({ error: "Error al cambiar el estado" }, { status: 500 });
  }
}
