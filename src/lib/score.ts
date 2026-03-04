import { RespuestaAprendiz } from "@/stores/evaluacion-store";

export interface EvaluacionResultado {
  puntajeTotal: number;
  preguntasCorrectas: number;       // crédito completo (1.0)
  preguntasIncorrectas: number;     // crédito 0
  preguntasParciales: number;       // crédito entre 0 y 1 (nuevo)
  totalPreguntas: number;
  aprobado: boolean;
  puntajePorTema?: Record<string, number>;
}

// -------------------------------------------------------------------------
// Crédito por pregunta (0..1)
// - seleccion_unica: todo o nada
// - seleccion_multiple: correctas_seleccionadas / total_correctas (leniente)
// - emparejamiento: pares_correctos / total_pares (leniente)
// -------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calcularCreditoPregunta(
  pregunta: any,
  respuestaApp: RespuestaAprendiz | undefined,
): number {
  if (!respuestaApp) return 0;

  if (pregunta.tipo === "seleccion_unica") {
    const correctas: string[] = pregunta.respuestaCorrecta ?? [];
    const seleccionadas = respuestaApp.respuestaIds ?? [];
    const sorted = (a: string[]) => [...a].sort();
    const eq =
      sorted(seleccionadas).join(",") === sorted(correctas).join(",");
    return eq ? 1 : 0;
  }

  if (pregunta.tipo === "seleccion_multiple") {
    const correctas: string[] = pregunta.respuestaCorrecta ?? [];
    if (correctas.length === 0) return 0;
    const seleccionadas = respuestaApp.respuestaIds ?? [];
    const aciertos = seleccionadas.filter((id) => correctas.includes(id)).length;
    return aciertos / correctas.length;
  }

  if (pregunta.tipo === "emparejamiento") {
    const pares: { izquierda: string; derecha: string }[] = pregunta.pares ?? [];
    if (pares.length === 0) return 0;
    const emparej = respuestaApp.emparejamientos ?? {};
    const aciertos = pares.filter(
      (par) => (emparej[par.izquierda] ?? "") === par.derecha,
    ).length;
    return aciertos / pares.length;
  }

  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calcularPuntaje(
  preguntas: any[],
  respuestasUsuario: Record<string, RespuestaAprendiz>,
  scoreParaAprobar: number,
): EvaluacionResultado {
  let sumaCreditos = 0;
  let preguntasCompletas = 0;
  let preguntasParciales = 0;

  const puntajePorTema: Record<string, { creditos: number; total: number }> =
    {};

  preguntas.forEach((pregunta) => {
    const tema = pregunta.tema || "General";
    if (!puntajePorTema[tema]) {
      puntajePorTema[tema] = { creditos: 0, total: 0 };
    }
    puntajePorTema[tema].total += 1;

    const respuestaApp = respuestasUsuario[String(pregunta.id)];
    const credito = calcularCreditoPregunta(pregunta, respuestaApp);

    sumaCreditos += credito;
    puntajePorTema[tema].creditos += credito;

    if (credito === 1) preguntasCompletas += 1;
    else if (credito > 0) preguntasParciales += 1;
  });

  const total = preguntas.length;
  const puntajeBase100 = total > 0 ? (sumaCreditos / total) * 100 : 0;
  const aprobado = puntajeBase100 >= scoreParaAprobar;

  const temasResult: Record<string, number> = {};
  Object.keys(puntajePorTema).forEach((t) => {
    const stats = puntajePorTema[t];
    temasResult[t] =
      stats.total > 0 ? (stats.creditos / stats.total) * 100 : 0;
  });

  const incorrectas = total - preguntasCompletas - preguntasParciales;

  return {
    puntajeTotal: parseFloat(puntajeBase100.toFixed(2)),
    preguntasCorrectas: preguntasCompletas,
    preguntasParciales,
    preguntasIncorrectas: incorrectas,
    totalPreguntas: total,
    aprobado,
    puntajePorTema: temasResult,
  };
}
