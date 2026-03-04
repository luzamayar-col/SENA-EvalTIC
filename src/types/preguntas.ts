export interface Opcion {
  id: string;
  texto: string;
}

export interface Par {
  izquierda: string;
  derecha: string;
}

export interface PreguntaSeleccionUnica {
  id: string;
  tipo: "seleccion_unica";
  enunciado: string;
  opciones: Opcion[];
  respuestaCorrecta: string;
  retroalimentacion?: string;
}

export interface PreguntaSeleccionMultiple {
  id: string;
  tipo: "seleccion_multiple";
  enunciado: string;
  opciones: Opcion[];
  respuestaCorrecta: string[];
  retroalimentacion?: string;
}

export interface PreguntaEmparejamiento {
  id: string;
  tipo: "emparejamiento";
  enunciado: string;
  pares: Par[];
  retroalimentacion?: string;
}

export type Pregunta =
  | PreguntaSeleccionUnica
  | PreguntaSeleccionMultiple
  | PreguntaEmparejamiento;

export type TipoPregunta = Pregunta["tipo"];

export const TIPO_LABELS: Record<TipoPregunta, string> = {
  seleccion_unica: "Sel. única",
  seleccion_multiple: "Sel. múltiple",
  emparejamiento: "Emparejamiento",
};
