import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { APP_CONFIG } from "@/lib/config";
import { calcularPuntaje } from "@/lib/score";
import { enviarCorreoResultado } from "@/lib/email";
import allQuestions from "@/data/preguntas.json";
import fs from "fs";
import path from "path";

const COMPLETED_EVALUATIONS_FILE = path.join(
  process.cwd(),
  "src/data/evaluaciones-completadas.json",
);

const finalizarSchema = z.object({
  cedula: z.string().min(4, "Cédula muy corta").max(20, "Cédula muy larga"),
  tipoDocumento: z.string().max(10).optional(),
  nombres: z.string().max(100).optional(),
  apellidos: z.string().max(100).optional(),
  email: z.string().max(200).optional(),
  programaFormacion: z.string().max(300).optional(),
  respuestasUsuario: z.record(z.string(), z.unknown()),
  fichaId: z.string().max(100).optional(),
  evaluacionId: z.string().max(100).optional(),
  tiempoUsado: z.number().int().min(0).max(18000).optional(),
  intentoNumero: z.number().int().min(0).max(100).optional(),
  esPrueba: z.boolean().optional(),
  incidenciasAntiplagio: z.number().int().min(0).max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = finalizarSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const {
      cedula,
      tipoDocumento,
      nombres,
      apellidos,
      email,
      respuestasUsuario,
      fichaId,
      evaluacionId,
      tiempoUsado,
      intentoNumero,
      esPrueba,
      incidenciasAntiplagio,
    } = body;

    // ═══ RAMA DB (feature flag) ═══════════════════════════════════════════════
    if (APP_CONFIG.useDatabaseBackend) {
      if (!evaluacionId) {
        return NextResponse.json(
          { error: "Faltan datos de la evaluación (evaluacionId)" },
          { status: 400 },
        );
      }

      const { prisma } = await import("@/lib/prisma");

      // 1. Cargar la evaluación desde DB (tiene preguntas con respuestas correctas)
      const evaluacion = await prisma.evaluacion.findUnique({
        where: { id: evaluacionId },
      });

      if (!evaluacion) {
        return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      const bancoCompleto = evaluacion.preguntas as any[];
      const passingScore =
        (evaluacion.config as any).passingScorePercentage ??
        APP_CONFIG.passingScorePercentage;

      // 2. Filtrar solo las preguntas que fueron respondidas
      const idsRespondidos = Object.keys(respuestasUsuario);
      const preguntasEvaluadas = bancoCompleto.filter((q) =>
        idsRespondidos.includes(q.id.toString()),
      );

      const resultado = calcularPuntaje(preguntasEvaluadas, respuestasUsuario as any, passingScore);

      // 3. Modo prueba del instructor: calcular pero NO guardar
      if (esPrueba === true) {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.instructorId) {
          return NextResponse.json(
            { error: "No autorizado para modo prueba" },
            { status: 401 },
          );
        }
        return NextResponse.json({
          resultado,
          preguntasCompletas: preguntasEvaluadas,
          esPrueba: true,
        });
      }

      // 4. Guardar en DB — fichaId requerido solo en modo normal
      if (!fichaId) {
        return NextResponse.json(
          { error: "Faltan datos de la evaluación (fichaId)" },
          { status: 400 },
        );
      }

      const intento =
        typeof intentoNumero === "number" && intentoNumero > 0
          ? intentoNumero
          : 1;

      try {
        await prisma.resultado.create({
          data: {
            cedula,
            tipoDocumento: tipoDocumento ?? "CC",
            nombres: nombres ?? "",
            apellidos: apellidos ?? "",
            email: email ?? "",
            puntaje: resultado.puntajeTotal,
            aprobado: resultado.aprobado,
            preguntasCorrectas: resultado.preguntasCorrectas,
            totalPreguntas: resultado.totalPreguntas,
            tiempoUsado: tiempoUsado ?? 0,
            respuestas: respuestasUsuario as Prisma.InputJsonValue,
            intento,
            esPrueba: false,
            incidenciasAntiplagio: incidenciasAntiplagio ?? 0,
            evaluacionId,
            fichaId,
          },
        });
      } catch (dbErr: any) {
        if (dbErr?.code === "P2002") {
          return NextResponse.json(
            { error: "Ya existe un resultado para este intento. Intenta de nuevo." },
            { status: 409 },
          );
        }
        throw dbErr;
      }

      // 5. Enviar correo al instructor (server-side, no expone endpoint público)
      // Fire-and-forget: no bloquear la respuesta si el correo falla
      enviarCorreoResultado({
        evaluacionId,
        fichaId,
        cedula,
        tipoDocumento: tipoDocumento ?? "CC",
        nombres: nombres ?? "",
        apellidos: apellidos ?? "",
        email: email ?? "",
        tiempoUsado: tiempoUsado ?? 0,
        resultado: {
          puntajeTotal: resultado.puntajeTotal,
          preguntasCorrectas: resultado.preguntasCorrectas,
          totalPreguntas: resultado.totalPreguntas,
          aprobado: resultado.aprobado,
        },
      }).catch((err) => console.error("Email dispatch error:", err));

      return NextResponse.json({
        resultado,
        preguntasCompletas: preguntasEvaluadas,
      });
    }

    // ═══ RAMA LEGACY (archivos JSON) ══════════════════════════════════════════
    let completadas: {
      cedula: string;
      fecha: string;
      puntaje: number;
      aprobado: boolean;
    }[] = [];
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
      return NextResponse.json(
        { error: "La evaluación ya fue presentada anteriormente." },
        { status: 403 },
      );
    }

    const idsRespondidos = Object.keys(respuestasUsuario);
    const preguntasEvaluadas = allQuestions.preguntas.filter((q) =>
      idsRespondidos.includes(q.id.toString()),
    );

    const resultado = calcularPuntaje(
      preguntasEvaluadas,
      respuestasUsuario as any,
      APP_CONFIG.passingScorePercentage,
    );

    const nuevoRegistro = {
      cedula,
      nombre: `${nombres} ${apellidos}`,
      fecha: new Date().toISOString(),
      puntaje: resultado.puntajeTotal,
      aprobado: resultado.aprobado,
    };

    completadas.push(nuevoRegistro);

    try {
      const dir = path.dirname(COMPLETED_EVALUATIONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        COMPLETED_EVALUATIONS_FILE,
        JSON.stringify(completadas, null, 2),
      );
    } catch (fsError) {
      console.warn(
        "No se pudo guardar la evaluación en disco (sistema de archivos de solo lectura). Retornando resultados en memoria.",
        fsError,
      );
    }

    return NextResponse.json({
      resultado,
      preguntasCompletas: preguntasEvaluadas,
    });
  } catch (error) {
    console.error("Error al finalizar evaluación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
