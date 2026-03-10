import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

export async function GET() {
  try {
    const session = await requireInstructor();
    const id = session.user.instructorId;

    const instructor = await prisma.instructor.findUnique({
      where: { id },
      select: {
        nombre: true,
        email: true,
        resendApiKey: true,
        emailNotificaciones: true,
      },
    });

    if (!instructor) {
      return NextResponse.json({ error: "Instructor no encontrado" }, { status: 404 });
    }

    // Mask the API key: show only last 4 chars
    const maskedKey = instructor.resendApiKey
      ? `re_${"*".repeat(16)}${instructor.resendApiKey.slice(-4)}`
      : null;

    return NextResponse.json({
      nombre: instructor.nombre,
      email: instructor.email,
      emailNotificaciones: instructor.emailNotificaciones,
      resendApiKey: maskedKey,
      tieneApiKey: !!instructor.resendApiKey,
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener el perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireInstructor();
    const id = session.user.instructorId;

    const body = await req.json();
    const { emailNotificaciones, resendApiKey } = body;

    const data: Record<string, unknown> = {};

    if (typeof emailNotificaciones === "boolean") {
      data.emailNotificaciones = emailNotificaciones;
    }

    // Only update the key if a new non-masked value is provided
    if (typeof resendApiKey === "string") {
      if (resendApiKey.trim() === "") {
        data.resendApiKey = null;
      } else if (!resendApiKey.includes("*")) {
        // If it contains asterisks it's the masked version — don't overwrite
        data.resendApiKey = resendApiKey.trim();
      }
    }

    const updated = await prisma.instructor.update({
      where: { id },
      data,
      select: {
        emailNotificaciones: true,
        resendApiKey: true,
      },
    });

    const maskedKey = updated.resendApiKey
      ? `re_${"*".repeat(16)}${updated.resendApiKey.slice(-4)}`
      : null;

    return NextResponse.json({
      emailNotificaciones: updated.emailNotificaciones,
      resendApiKey: maskedKey,
      tieneApiKey: !!updated.resendApiKey,
    });
  } catch {
    return NextResponse.json({ error: "Error al actualizar el perfil" }, { status: 500 });
  }
}
