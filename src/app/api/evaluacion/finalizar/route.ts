import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { calcularPuntaje } from "@/lib/score";
import allQuestions from "@/data/preguntas.json";
import fs from "fs";
import path from "path";

const COMPLETED_EVALUATIONS_FILE = path.join(
  process.cwd(),
  "src/data/evaluaciones-completadas.json",
);

export async function POST(request: Request) {
  try {
    const { cedula, nombres, apellidos, respuestasUsuario } =
      await request.json();

    if (!cedula || !respuestasUsuario) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 1. Cargar datos de los que ya presentaron para evitar duplicados en la grabación
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

    // 2. Extraer las preguntas del banco (todas, ya que tienen las respuestas correctas incluidas)
    // Extraer solo las preguntas que fueron respondidas o de las que necesitamos las respuestas correctas
    // O simplemente pasar el banco completo y que calcularPuntaje lo use.
    // wait, `calcularPuntaje` takes "preguntas", so we need to filter the original bank to only the selected questions
    // In order for the server to know which questions were selected, we must extract them based on the `respuestasUsuario` IDs
    // since the client doesn't send the full question object back, or just evaluate all existing IDs in the answers.

    const idsRespondidos = Object.keys(respuestasUsuario);
    const preguntasEvaluadas = allQuestions.preguntas.filter((q) =>
      idsRespondidos.includes(q.id.toString()),
    );

    const resultado = calcularPuntaje(
      preguntasEvaluadas,
      respuestasUsuario,
      APP_CONFIG.passingScorePercentage,
    );

    // 3. Registrar como completada
    const nuevoRegistro = {
      cedula,
      nombre: `${nombres} ${apellidos}`,
      fecha: new Date().toISOString(),
      puntaje: resultado.puntajeTotal,
      aprobado: resultado.aprobado,
    };

    completadas.push(nuevoRegistro);

    // Asegurar que el directorio exista (con try-catch para Vercel/Serverless)
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

    // 4. Retornar el resultado de la evaluación junto con las preguntas originales
    // para que el cliente pueda mostrar cuáles eran las opciones correctas en los detalles.
    return NextResponse.json({
      resultado,
      preguntasCompletas: preguntasEvaluadas, // Devuelve las preguntas completas incluyendo `respuestaCorrecta` y `retroalimentacion` a la página de resultados
    });
  } catch (error) {
    console.error("Error al finalizar evaluación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
