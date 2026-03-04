import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

interface Params {
  params: Promise<{ id: string }>;
}

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

    const body = await req.json();
    const { nombre, email, password } = body;

    if (!nombre?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {
      nombre: nombre.trim(),
      email: email.trim(),
    };
    if (password?.trim()) {
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
