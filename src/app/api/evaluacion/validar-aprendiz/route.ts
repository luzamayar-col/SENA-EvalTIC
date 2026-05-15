import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { getEffectiveDates, isVigente } from "@/lib/effective-dates";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cedula = searchParams.get("cedula");
  const fichaNumero = searchParams.get("ficha");

  if (!cedula || !fichaNumero) {
    return NextResponse.json(
      { encontrado: false, error: "Cédula y número de ficha son requeridos" },
      { status: 400 }
    );
  }

  if (!APP_CONFIG.useDatabaseBackend) {
    return NextResponse.json({ encontrado: true });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // 1. Buscar ficha activa con evaluacion activa (sin filtrar por fechas — se hace en JS)
    const now = new Date();
    const ficha = await prisma.ficha.findFirst({
      where: {
        numero: fichaNumero,
        activa: true,
        evaluacion: { activa: true },
      },
      select: {
        id: true,
        numero: true,
        programa: true,
        fechaInicio: true,
        fechaFin: true,
        evaluacion: {
          select: {
            id: true,
            nombre: true,
            competencia: true,
            resultadoAprendizaje: true,
            maxIntentos: true,
            config: true,
            fechaInicio: true,
            fechaFin: true,
            instructor: { select: { email: true } },
          },
        },
      },
    });

    if (!ficha) {
      return NextResponse.json({
        encontrado: false,
        error: "Ficha no válida o sin evaluación activa. Verifica el número con tu instructor.",
      });
    }

    // 1b. Validar vigencia usando fechas efectivas (ficha overrides evaluación)
    const eff = getEffectiveDates(ficha, ficha.evaluacion);
    const vigencia = isVigente(eff, now);
    if (!vigencia.ok) {
      const msg =
        vigencia.reason === "antes"
          ? `La evaluación aún no está disponible. Disponible desde el ${vigencia.fecha.toLocaleDateString("es-CO")}.`
          : `La evaluación finalizó el ${vigencia.fecha.toLocaleDateString("es-CO")}.`;
      return NextResponse.json({ encontrado: false, error: msg });
    }

    // 2. Buscar aprendiz en el roster
    const aprendiz = await prisma.aprendiz.findUnique({
      where: { cedula_fichaId: { cedula, fichaId: ficha.id } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        tipoDocumento: true,
        email: true,
        intentosExtra: true,
      },
    });

    if (!aprendiz) {
      return NextResponse.json({
        encontrado: false,
        instructorEmail: ficha.evaluacion.instructor.email,
        error:
          "No estás registrado en esta ficha. Verifica el número de ficha y tu cédula con tu instructor.",
      });
    }

    // 3. Contar intentos usados (excluir pruebas del instructor)
    const intentosUsados = await prisma.resultado.count({
      where: { cedula, evaluacionId: ficha.evaluacion.id, esPrueba: false },
    });

    const intentosPermitidos = ficha.evaluacion.maxIntentos + aprendiz.intentosExtra;
    const puedeIniciar = intentosUsados < intentosPermitidos;

    // When attempts exhausted, fetch last resultado ID so the student can download their report
    let ultimoResultadoId: string | null = null;
    if (!puedeIniciar) {
      const ultimo = await prisma.resultado.findFirst({
        where: { cedula, evaluacionId: ficha.evaluacion.id, esPrueba: false },
        orderBy: { intento: "desc" },
        select: { id: true },
      });
      ultimoResultadoId = ultimo?.id ?? null;
    }

    const cfg = ficha.evaluacion.config as {
      timeLimitMinutes?: number;
      distribucionPreguntas?: {
        seleccion_unica?: number;
        seleccion_multiple?: number;
        emparejamiento?: number;
      };
    } | null;

    const totalPreguntas = cfg?.distribucionPreguntas
      ? (cfg.distribucionPreguntas.seleccion_unica ?? 0) +
        (cfg.distribucionPreguntas.seleccion_multiple ?? 0) +
        (cfg.distribucionPreguntas.emparejamiento ?? 0)
      : null;

    return NextResponse.json({
      encontrado: true,
      nombres: aprendiz.nombres,
      apellidos: aprendiz.apellidos,
      tipoDocumento: aprendiz.tipoDocumento,
      email: aprendiz.email,
      instructorEmail: ficha.evaluacion.instructor.email,
      puedeIniciar,
      intentosUsados,
      intentosPermitidos,
      ultimoResultadoId,
      tiempoLimiteMinutos: cfg?.timeLimitMinutes ?? null,
      totalPreguntas,
      ficha: {
        id: ficha.id,
        numero: ficha.numero,
        programa: ficha.programa,
        evaluacion: {
          nombre: ficha.evaluacion.nombre,
          competencia: ficha.evaluacion.competencia,
          resultadoAprendizaje: ficha.evaluacion.resultadoAprendizaje,
        },
      },
    });
  } catch (error) {
    console.error("Error al validar aprendiz:", error);
    return NextResponse.json(
      { encontrado: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
