import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { getEffectiveDates, isVigente } from "@/lib/effective-dates";

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
        fechaInicio: true,
        fechaFin: true,
        evaluacion: { select: { nombre: true, fechaInicio: true, fechaFin: true } },
      },
    });

    if (!ficha) {
      return NextResponse.json({ valida: false });
    }

    // Validar fechas de vigencia usando fechas efectivas (ficha overrides evaluación)
    const now = new Date();
    const eff = getEffectiveDates(ficha, ficha.evaluacion);
    const vigencia = isVigente(eff, now);

    if (!vigencia.ok) {
      if (vigencia.reason === "antes") {
        return NextResponse.json({
          valida: false,
          error: `Disponible desde el ${vigencia.fecha.toLocaleDateString("es-CO")}`,
          fechaEfectivaInicio: eff.fechaInicio?.toISOString() ?? null,
          fechaEfectivaFin: eff.fechaFin?.toISOString() ?? null,
        });
      }
      return NextResponse.json({
        valida: false,
        error: `Venció el ${vigencia.fecha.toLocaleDateString("es-CO")}`,
        fechaEfectivaInicio: eff.fechaInicio?.toISOString() ?? null,
        fechaEfectivaFin: eff.fechaFin?.toISOString() ?? null,
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
