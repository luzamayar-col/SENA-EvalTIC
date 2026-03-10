import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial");

const crearInstructorSchema = z.object({
  nombre: z.string().min(4, "Nombre demasiado corto").max(150).trim(),
  email: z.string().email("Email inválido").max(200).toLowerCase().trim(),
  password: passwordSchema,
  isAdmin: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireInstructor();

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [instructores, total] = await Promise.all([
      prisma.instructor.findMany({
        orderBy: { creadoEn: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          nombre: true,
          email: true,
          isAdmin: true,
          creadoEn: true,
          _count: { select: { evaluaciones: true } },
        },
      }),
      prisma.instructor.count(),
    ]);

    return NextResponse.json({
      data: instructores,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

    const rawBody = await req.json();
    const parsed = crearInstructorSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { nombre, email, password, isAdmin } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 12);

    const instructor = await prisma.instructor.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        isAdmin,
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
