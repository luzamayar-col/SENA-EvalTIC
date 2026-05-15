import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

async function getAprendizForInstructor(aprendizId: string, instructorId: string) {
  return prisma.aprendiz.findFirst({
    where: {
      id: aprendizId,
      ficha: { evaluacion: { instructorId } },
    },
    include: { ficha: { select: { evaluacion: { select: { id: true } } } } },
  });
}

// ─── PUT: edit aprendiz ───────────────────────────────────────────────────────

const editSchema = z.object({
  nombres: z.string().min(1).optional(),
  apellidos: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).optional(),
  emailInstitucional: z.string().email().optional().or(z.literal("")).optional(),
  emailPersonal: z.string().email().optional().or(z.literal("")).optional(),
  tipoDocumento: z.string().min(2).optional(),
  intentosExtra: z.number().int().min(0).optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const aprendiz = await getAprendizForInstructor(id, session.user.instructorId);
  if (!aprendiz) {
    return NextResponse.json({ error: "Aprendiz no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { email, emailInstitucional, emailPersonal, ...rest } = parsed.data;
  const updated = await prisma.aprendiz.update({
    where: { id },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email.trim() || null } : {}),
      ...(emailInstitucional !== undefined ? { emailInstitucional: emailInstitucional.trim() || null } : {}),
      ...(emailPersonal !== undefined ? { emailPersonal: emailPersonal.trim() || null } : {}),
    },
  });

  return NextResponse.json(updated);
}

// ─── DELETE: remove aprendiz ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const aprendiz = await getAprendizForInstructor(id, session.user.instructorId);
  if (!aprendiz) {
    return NextResponse.json({ error: "Aprendiz no encontrado" }, { status: 404 });
  }

  // Block deletion if the learner has submitted results
  const resultadosCount = await prisma.resultado.count({
    where: {
      cedula: aprendiz.cedula,
      evaluacionId: aprendiz.ficha.evaluacion.id,
      esPrueba: false,
    },
  });

  if (resultadosCount > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: el aprendiz tiene ${resultadosCount} resultado(s) registrado(s). Eliminar los resultados primero si es necesario.`,
      },
      { status: 409 }
    );
  }

  await prisma.aprendiz.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
