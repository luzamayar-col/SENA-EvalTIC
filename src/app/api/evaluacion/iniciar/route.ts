import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { shuffleArray } from "@/lib/shuffle";
import { getEffectiveDates, isVigente } from "@/lib/effective-dates";
import allQuestions from "@/data/preguntas.json";
import fs from "fs";
import path from "path";

const COMPLETED_EVALUATIONS_FILE = path.join(
  process.cwd(),
  "src/data/evaluaciones-completadas.json",
);

// ─── Helper: selecciona y prepara preguntas para el cliente ──────────────────
function prepareQuestionsForClient(
  banco: any[],
  dist: {
    seleccion_unica: number;
    seleccion_multiple: number;
    emparejamiento: number;
  },
  aleatorizarOpciones: boolean,
) {
  const unicas = banco.filter((p) => p.tipo === "seleccion_unica");
  const multiples = banco.filter((p) => p.tipo === "seleccion_multiple");
  const emparejamiento = banco.filter((p) => p.tipo === "emparejamiento");

  const seleccionadas = shuffleArray([
    ...shuffleArray([...unicas]).slice(0, dist.seleccion_unica),
    ...shuffleArray([...multiples]).slice(0, dist.seleccion_multiple),
    ...shuffleArray([...emparejamiento]).slice(0, dist.emparejamiento),
  ]);

  return seleccionadas.map((p: any) => {
    const preguntaCliente = JSON.parse(JSON.stringify(p));
    delete preguntaCliente.respuestaCorrecta;
    delete preguntaCliente.retroalimentacion;

    // Normalize: external format uses "texto", internal renderer expects "enunciado"
    if (!preguntaCliente.enunciado && preguntaCliente.texto) {
      preguntaCliente.enunciado = preguntaCliente.texto;
    }

    if (p.tipo === "seleccion_unica" || p.tipo === "seleccion_multiple") {
      if (aleatorizarOpciones) {
        preguntaCliente.opciones = shuffleArray([...preguntaCliente.opciones]);
      }
    } else if (p.tipo === "emparejamiento") {
      const opcionesIzquierda = p.pares.map((par: any) => par.izquierda);
      const opcionesDerecha = p.pares.map((par: any) => par.derecha);
      preguntaCliente.izquierdas = opcionesIzquierda;
      preguntaCliente.derechas = aleatorizarOpciones
        ? shuffleArray([...opcionesDerecha])
        : opcionesDerecha;
      delete preguntaCliente.pares;
    }

    return preguntaCliente;
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cedula, ficha } = body;

    if (!cedula) {
      return NextResponse.json({ error: "Cédula requerida" }, { status: 400 });
    }

    // ═══ RAMA DB (feature flag) ═══════════════════════════════════════════════
    if (APP_CONFIG.useDatabaseBackend) {
      const { prisma } = await import("@/lib/prisma");

      if (!ficha) {
        return NextResponse.json(
          { error: "Número de ficha requerido" },
          { status: 400 },
        );
      }

      // 1. Buscar ficha con evaluación activa (y ficha activa)
      const fichaDB = await prisma.ficha.findFirst({
        where: {
          numero: ficha,
          activa: true,
          evaluacion: { activa: true },
        },
        include: { evaluacion: true },
      });

      if (!fichaDB) {
        return NextResponse.json(
          {
            error:
              "Ficha no válida o sin evaluación activa. Verifica el número con tu instructor.",
          },
          { status: 404 },
        );
      }

      // 2. Validar fechas de vigencia usando fechas efectivas (ficha overrides evaluación)
      const now = new Date();
      const eff = getEffectiveDates(fichaDB, fichaDB.evaluacion);
      const vigencia = isVigente(eff, now);

      if (!vigencia.ok) {
        if (vigencia.reason === "antes") {
          return NextResponse.json(
            {
              error: `La evaluación aún no está disponible. Fecha de inicio: ${vigencia.fecha.toLocaleDateString("es-CO")}.`,
            },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            error: `La evaluación finalizó el ${vigencia.fecha.toLocaleDateString("es-CO")}.`,
          },
          { status: 403 },
        );
      }

      // 3. Validar aprendiz en roster
      const aprendiz = await prisma.aprendiz.findUnique({
        where: { cedula_fichaId: { cedula, fichaId: fichaDB.id } },
      });
      if (!aprendiz) {
        return NextResponse.json(
          {
            error:
              "No estás registrado en esta ficha. Verifica el número de ficha y tu cédula con tu instructor.",
            notInRoster: true,
          },
          { status: 403 },
        );
      }

      // 4. Contar intentos usados (excluir pruebas del instructor)
      const intentosUsados = await prisma.resultado.count({
        where: { cedula, evaluacionId: fichaDB.evaluacionId, esPrueba: false },
      });
      const intentosPermitidos =
        fichaDB.evaluacion.maxIntentos + aprendiz.intentosExtra;

      if (intentosUsados >= intentosPermitidos && process.env.NODE_ENV !== "development") {
        const ultimoIntento = await prisma.resultado.findFirst({
          where: { cedula, evaluacionId: fichaDB.evaluacionId, esPrueba: false },
          orderBy: { presentadoEn: "desc" },
        });
        return NextResponse.json({
          yaPresento: true,
          intentosUsados,
          intentosPermitidos,
          ultimoIntento: ultimoIntento
            ? {
                fecha: ultimoIntento.presentadoEn.toISOString(),
                puntaje: ultimoIntento.puntaje,
                aprobado: ultimoIntento.aprobado,
              }
            : null,
        });
      }

      // 4. Preparar preguntas desde la evaluación en DB
      const config = fichaDB.evaluacion.config as {
        timeLimitMinutes: number;
        passingScorePercentage: number;
        distribucionPreguntas: {
          seleccion_unica: number;
          seleccion_multiple: number;
          emparejamiento: number;
        };
        aleatorizarOpciones: boolean;
        umbralAntiplagio?: { medio: number; alto: number };
      };
      const banco = fichaDB.evaluacion.preguntas as any[];
      const preguntasCliente = prepareQuestionsForClient(
        banco,
        config.distribucionPreguntas,
        config.aleatorizarOpciones,
      );

      return NextResponse.json({
        yaPresento: false,
        preguntas: preguntasCliente,
        tiempoLimite: config.timeLimitMinutes * 60,
        fichaId: fichaDB.id,
        evaluacionId: fichaDB.evaluacionId,
        intentoNumero: intentosUsados + 1,
        umbralAntiplagio: config.umbralAntiplagio ?? { medio: 3, alto: 5 },
        aprendizInfo: {
          nombres: aprendiz.nombres,
          apellidos: aprendiz.apellidos,
          tipoDocumento: aprendiz.tipoDocumento,
          email: aprendiz.email,
          programa: fichaDB.programa,
          competencia: fichaDB.evaluacion.competencia,
          resultadoAprendizaje: fichaDB.evaluacion.resultadoAprendizaje,
        },
      });
    }

    // ═══ RAMA LEGACY (archivos JSON) ══════════════════════════════════════════
    let completadas: any[] = [];
    if (fs.existsSync(COMPLETED_EVALUATIONS_FILE)) {
      try {
        const data = fs.readFileSync(COMPLETED_EVALUATIONS_FILE, "utf8");
        if (data.trim() !== "") {
          completadas = JSON.parse(data);
        }
      } catch (e) {
        console.error("Error parseando JSON de completadas:", e);
        completadas = [];
      }
    }

    const registroExistente = completadas.find((r) => r.cedula === cedula);
    if (registroExistente && process.env.NODE_ENV !== "development") {
      return NextResponse.json({
        yaPresento: true,
        fecha: registroExistente.fecha,
        puntaje: registroExistente.puntaje,
        aprobado: registroExistente.aprobado,
      });
    }

    const dist = APP_CONFIG.distribucionPreguntas;
    const preguntasCliente = prepareQuestionsForClient(
      allQuestions.preguntas as any[],
      dist,
      APP_CONFIG.aleatorizarOpciones,
    );

    return NextResponse.json({
      yaPresento: false,
      preguntas: preguntasCliente,
      tiempoLimite: APP_CONFIG.timeLimitMinutes * 60,
    });
  } catch (error) {
    console.error("Error al iniciar evaluación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
