import { RespuestaAprendiz } from "@/stores/evaluacion-store";

export interface EvaluacionResultado {
  puntajeTotal: number;
  preguntasCorrectas: number;
  preguntasIncorrectas: number;
  totalPreguntas: number;
  aprobado: boolean;
  puntajePorTema?: Record<string, number>;
}

// Función auxiliar para comparar arrays de strings sin importar el orden
const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

// Función auxiliar para comparar objetos de emparejamiento
const emparejamientosEqual = (
  a: Record<string, string>,
  b: Record<string, string>,
) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calcularPuntaje(
  preguntas: any[],
  respuestasUsuario: Record<string, RespuestaAprendiz>,
  scoreParaAprobar: number,
): EvaluacionResultado {
  let correctas = 0;

  // Opcional: calcular puntajes por temas si las preguntas tienen la propiedad "tema"
  const puntajePorTema: Record<string, { correctas: number; total: number }> =
    {};

  preguntas.forEach((pregunta) => {
    // Rastrear estadísticas por tema si es necesario en el futuro
    const tema = pregunta.tema || "General";
    if (!puntajePorTema[tema]) {
      puntajePorTema[tema] = { correctas: 0, total: 0 };
    }
    puntajePorTema[tema].total += 1;

    const respuestaApp = respuestasUsuario[String(pregunta.id)];
    let esCorrecta = false;

    if (!respuestaApp) {
      // No respondida se cuenta como incorrecta
      return;
    }

    if (
      pregunta.tipo === "seleccion_unica" ||
      pregunta.tipo === "seleccion_multiple"
    ) {
      // Las respuestas correctas están directamente en 'respuestaCorrecta' ahora
      const opcionesCorrectas = pregunta.respuestaCorrecta || [];

      if (
        respuestaApp.respuestaIds &&
        arraysEqual(respuestaApp.respuestaIds, opcionesCorrectas)
      ) {
        esCorrecta = true;
      }
    } else if (pregunta.tipo === "emparejamiento") {
      // Extraer las parejas correctas del campo 'pares'
      const parejasCorrectas: Record<string, string> = {};

      if (pregunta.pares && Array.isArray(pregunta.pares)) {
        pregunta.pares.forEach(
          (par: { izquierda: string; derecha: string }) => {
            parejasCorrectas[par.izquierda] = par.derecha;
          },
        );
      }

      if (
        respuestaApp.emparejamientos &&
        emparejamientosEqual(respuestaApp.emparejamientos, parejasCorrectas)
      ) {
        esCorrecta = true;
      }
    }

    if (esCorrecta) {
      correctas += 1;
      puntajePorTema[tema].correctas += 1;
    }
  });

  const total = preguntas.length;
  const puntajeBase100 = total > 0 ? (correctas / total) * 100 : 0;
  const aprobado = puntajeBase100 >= scoreParaAprobar;

  // Convertir a porcentajes simples por tema
  const temasResult: Record<string, number> = {};
  Object.keys(puntajePorTema).forEach((t) => {
    const stats = puntajePorTema[t];
    temasResult[t] =
      stats.total > 0 ? (stats.correctas / stats.total) * 100 : 0;
  });

  return {
    puntajeTotal: Math.round(puntajeBase100),
    preguntasCorrectas: correctas,
    preguntasIncorrectas: total - correctas,
    totalPreguntas: total,
    aprobado,
    puntajePorTema: temasResult,
  };
}
