import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { shuffleArray } from "@/lib/shuffle";
import allQuestions from "@/data/preguntas.json";
import fs from "fs";
import path from "path";

const COMPLETED_EVALUATIONS_FILE = path.join(
  process.cwd(),
  "src/data/evaluaciones-completadas.json",
);

export async function POST(request: Request) {
  try {
    const { cedula } = await request.json();

    if (!cedula) {
      return NextResponse.json({ error: "Cédula requerida" }, { status: 400 });
    }

    // Verificar si ya presentó
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

    // Seleccionar y aleatorizar preguntas
    const banco = allQuestions.preguntas;
    const unicas = banco.filter((p) => p.tipo === "seleccion_unica");
    const multiples = banco.filter((p) => p.tipo === "seleccion_multiple");
    const emparejamiento = banco.filter((p) => p.tipo === "emparejamiento");

    const dist = APP_CONFIG.distribucionPreguntas;
    const shuffledUnicas = shuffleArray([...unicas]).slice(
      0,
      dist.seleccion_unica,
    );
    const shuffledMultiples = shuffleArray([...multiples]).slice(
      0,
      dist.seleccion_multiple,
    );
    const shuffledEmparejamiento = shuffleArray([...emparejamiento]).slice(
      0,
      dist.emparejamiento,
    );

    const seleccionadas = [
      ...shuffledUnicas,
      ...shuffledMultiples,
      ...shuffledEmparejamiento,
    ];

    const preguntasFinales = shuffleArray(seleccionadas);

    // Preparar preguntas para el cliente (quitar respuestas correctas y aleatorizar opciones)
    const preguntasCliente = preguntasFinales.map((p: any) => {
      // Clone the object to avoid mutating the original
      const preguntaCliente = JSON.parse(JSON.stringify(p));

      // Remove sensitive fields
      delete preguntaCliente.respuestaCorrecta;
      delete preguntaCliente.retroalimentacion;

      if (p.tipo === "seleccion_unica" || p.tipo === "seleccion_multiple") {
        if (APP_CONFIG.aleatorizarOpciones) {
          preguntaCliente.opciones = shuffleArray([
            ...preguntaCliente.opciones,
          ]);
        }
      } else if (p.tipo === "emparejamiento") {
        const opcionesIzquierda = p.pares.map((par: any) => par.izquierda); // Orden original
        const opcionesDerecha = p.pares.map((par: any) => par.derecha);

        preguntaCliente.izquierdas = opcionesIzquierda;
        if (APP_CONFIG.aleatorizarOpciones) {
          preguntaCliente.derechas = shuffleArray([...opcionesDerecha]);
        } else {
          preguntaCliente.derechas = opcionesDerecha;
        }

        // Eliminar el campo pares original que tiene la asociación correcta lado a lado
        delete preguntaCliente.pares;
      }

      return preguntaCliente;
    });

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
