import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { shuffleArray } from "@/lib/shuffle";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const evaluacion = await prisma.evaluacion.findFirst({
    where: { id, instructorId: session.user.instructorId },
  });

  if (!evaluacion) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  const config = evaluacion.config as {
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

  const banco = evaluacion.preguntas as any[];
  const dist = config.distribucionPreguntas;

  const unicas = banco.filter((p) => p.tipo === "seleccion_unica");
  const multiples = banco.filter((p) => p.tipo === "seleccion_multiple");
  const emparejamiento = banco.filter((p) => p.tipo === "emparejamiento");

  const seleccionadas = shuffleArray([
    ...shuffleArray([...unicas]).slice(0, dist.seleccion_unica),
    ...shuffleArray([...multiples]).slice(0, dist.seleccion_multiple),
    ...shuffleArray([...emparejamiento]).slice(0, dist.emparejamiento),
  ]);

  const preguntasCliente = seleccionadas.map((p: any) => {
    const preguntaCliente = JSON.parse(JSON.stringify(p));
    delete preguntaCliente.respuestaCorrecta;
    delete preguntaCliente.retroalimentacion;

    // Normalize: external format uses "texto", internal renderer expects "enunciado"
    if (!preguntaCliente.enunciado && preguntaCliente.texto) {
      preguntaCliente.enunciado = preguntaCliente.texto;
    }

    if (p.tipo === "seleccion_unica" || p.tipo === "seleccion_multiple") {
      if (config.aleatorizarOpciones) {
        preguntaCliente.opciones = shuffleArray([...preguntaCliente.opciones]);
      }
    } else if (p.tipo === "emparejamiento") {
      const opcionesIzquierda = p.pares.map((par: any) => par.izquierda);
      const opcionesDerecha = p.pares.map((par: any) => par.derecha);
      preguntaCliente.izquierdas = opcionesIzquierda;
      preguntaCliente.derechas = config.aleatorizarOpciones
        ? shuffleArray([...opcionesDerecha])
        : opcionesDerecha;
      delete preguntaCliente.pares;
    }

    return preguntaCliente;
  });

  return NextResponse.json({
    yaPresento: false,
    preguntas: preguntasCliente,
    tiempoLimite: config.timeLimitMinutes * 60,
    fichaId: null,
    evaluacionId: id,
    intentoNumero: 0,
    testMode: true,
    umbralAntiplagio: config.umbralAntiplagio ?? { medio: 3, alto: 5 },
    aprendizInfo: {
      nombres: session.user.name ?? "Instructor",
      apellidos: "(Modo Prueba)",
      tipoDocumento: "CC",
      email: null,
      programa: evaluacion.nombre,
      competencia: evaluacion.competencia,
      resultadoAprendizaje: evaluacion.resultadoAprendizaje,
    },
  });
}
