import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

interface Params {
  params: Promise<{ id: string }>;
}

const passwordComplexSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial");

const editarInstructorSchema = z.object({
  nombre: z.string().min(4, "Nombre demasiado corto").max(150).trim(),
  email: z.string().email("Email inválido").max(200).toLowerCase().trim(),
  // Contraseña opcional: si se envía y no está vacía, debe cumplir complejidad
  password: z
    .string()
    .refine(
      (val) => !val || val.length === 0 || passwordComplexSchema.safeParse(val).success,
      {
        message:
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial",
      },
    )
    .optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.instructor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Instructor no encontrado" }, { status: 404 });
    }

    const rawBody = await req.json();
    const parsed = editarInstructorSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { nombre, email, password } = parsed.data;

    const data: Record<string, unknown> = { nombre, email };
    if (password && password.trim()) {
      data.password = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.instructor.update({ where: { id }, data });

    return NextResponse.json({
      id: updated.id,
      nombre: updated.nombre,
      email: updated.email,
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un instructor con ese email" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Error al actualizar el instructor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireInstructor();

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.user.instructorId) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 400 },
      );
    }

    const existing = await prisma.instructor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Instructor no encontrado" }, { status: 404 });
    }

    if (existing.isAdmin) {
      return NextResponse.json(
        { error: "No se puede eliminar un administrador" },
        { status: 400 },
      );
    }

    await prisma.instructor.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar el instructor" }, { status: 500 });
  }
}
