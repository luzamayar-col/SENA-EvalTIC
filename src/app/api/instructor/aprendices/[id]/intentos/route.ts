import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  intentosExtra: z.number().int().min(0).max(20),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const aprendiz = await prisma.aprendiz.findFirst({
    where: { id, ficha: { evaluacion: { instructorId: session.user.instructorId } } },
    select: { id: true, cedula: true, nombres: true, apellidos: true, intentosExtra: true },
  });

  if (!aprendiz) {
    return NextResponse.json({ error: "Aprendiz no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Valor inválido" },
      { status: 400 }
    );
  }

  const updated = await prisma.aprendiz.update({
    where: { id },
    data: { intentosExtra: parsed.data.intentosExtra },
    select: { id: true, cedula: true, nombres: true, apellidos: true, intentosExtra: true },
  });

  return NextResponse.json(updated);
}
