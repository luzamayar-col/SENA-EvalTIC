import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await requireInstructor();

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const instructores = await prisma.instructor.findMany({
      orderBy: { creadoEn: "asc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        isAdmin: true,
        creadoEn: true,
        _count: { select: { evaluaciones: true } },
      },
    });

    return NextResponse.json(instructores);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireInstructor();

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, email, password, isAdmin } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const instructor = await prisma.instructor.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        isAdmin: isAdmin === true,
      },
    });

    return NextResponse.json(
      { id: instructor.id, nombre: instructor.nombre, email: instructor.email },
      { status: 201 },
    );
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
    return NextResponse.json({ error: "Error al crear el instructor" }, { status: 500 });
  }
}
