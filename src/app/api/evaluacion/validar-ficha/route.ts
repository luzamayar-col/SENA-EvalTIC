import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const numero = searchParams.get("numero");

  if (!numero) {
    return NextResponse.json({ valida: false, error: "Número de ficha requerido" }, { status: 400 });
  }

  // Solo tiene sentido validar contra DB cuando el backend DB está activo
  if (!APP_CONFIG.useDatabaseBackend) {
    // En modo legacy no hay validación de fichas; siempre es válida
    return NextResponse.json({ valida: true });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const ficha = await prisma.ficha.findFirst({
      where: {
        numero,
        activa: true,
        evaluacion: { activa: true },
      },
      select: {
        id: true,
        programa: true,
        evaluacion: { select: { nombre: true, fechaInicio: true, fechaFin: true } },
      },
    });

    if (!ficha) {
      return NextResponse.json({ valida: false });
    }

    // Validar fechas de vigencia
    const now = new Date();
    const { fechaInicio, fechaFin } = ficha.evaluacion;
    if (fechaInicio && now < fechaInicio) {
      return NextResponse.json({
        valida: false,
        error: `Disponible desde el ${fechaInicio.toLocaleDateString("es-CO")}`,
      });
    }
    if (fechaFin && now > fechaFin) {
      return NextResponse.json({
        valida: false,
        error: `Venció el ${fechaFin.toLocaleDateString("es-CO")}`,
      });
    }

    return NextResponse.json({
      valida: true,
      programa: ficha.programa,
      evaluacion: ficha.evaluacion.nombre,
    });
  } catch (error) {
    console.error("Error al validar ficha:", error);
    return NextResponse.json({ valida: false, error: "Error interno" }, { status: 500 });
  }
}
