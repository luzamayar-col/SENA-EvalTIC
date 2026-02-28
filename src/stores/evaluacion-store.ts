import { create } from "zustand";
import { EvaluacionResultado } from "@/lib/score";

export interface DatosAprendiz {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo: string;
  ficha: string;
  programaFormacion: string;
}

export interface RespuestaAprendiz {
  preguntaId: string;
  respuestaIds?: string[]; // Multiple choice or single choice
  emparejamientos?: Record<string, string>; // Sub-pregunta ID -> Opcion ID
}

export interface EvaluacionState {
  datosAprendiz: DatosAprendiz | null;
  preguntasDisponibles: any[];
  preguntasSeleccionadas: any[];
  respuestas: Record<string, RespuestaAprendiz>;
  preguntaActualIndex: number;
  tiempoRestante: number; // en segundos
  tiempoTranscurrido: number; // en segundos
  resultado: EvaluacionResultado | null;
  estado: "inicio" | "evaluando" | "resultados";

  // Acciones
  setDatosAprendiz: (datos: DatosAprendiz) => void;
  iniciarEvaluacion: (
    preguntasSeleccionadas: any[],
    tiempoRestante: number,
  ) => void;
  responderPregunta: (respuesta: RespuestaAprendiz) => void;
  siguientePregunta: () => void;
  preguntaAnterior: () => void;
  avanzarAPregunta: (index: number) => void;
  tickTiempo: () => void;
  finalizarEvaluacion: () => Promise<void>;
  reiniciarEstado: () => void;
}

export const useEvaluacionStore = create<EvaluacionState>((set, get) => ({
  datosAprendiz: null,
  preguntasDisponibles: [],
  preguntasSeleccionadas: [],
  respuestas: {},
  preguntaActualIndex: 0,
  tiempoRestante: 0,
  tiempoTranscurrido: 0,
  resultado: null,
  estado: "inicio",

  setDatosAprendiz: (datos) => set({ datosAprendiz: datos }),

  iniciarEvaluacion: (preguntas, tiempo) => {
    // Limpiar cualquier respuesta previa (por hot reload en dev o sesión anterior)
    if (typeof window !== "undefined") {
      localStorage.removeItem("evaluacion-storage");
    }
    set({
      estado: "evaluando",
      preguntasSeleccionadas: preguntas,
      tiempoRestante: tiempo,
      tiempoTranscurrido: 0,
      preguntaActualIndex: 0,
      respuestas: {},
    });
  },

  responderPregunta: (respuesta) =>
    set((state) => ({
      respuestas: { ...state.respuestas, [respuesta.preguntaId]: respuesta },
    })),

  siguientePregunta: () =>
    set((state) => {
      if (state.preguntaActualIndex < state.preguntasSeleccionadas.length - 1) {
        return { preguntaActualIndex: state.preguntaActualIndex + 1 };
      }
      return state;
    }),

  preguntaAnterior: () =>
    set((state) => {
      if (state.preguntaActualIndex > 0) {
        return { preguntaActualIndex: state.preguntaActualIndex - 1 };
      }
      return state;
    }),

  avanzarAPregunta: (index: number) =>
    set((state) => {
      if (index >= 0 && index < state.preguntasSeleccionadas.length) {
        return { preguntaActualIndex: index };
      }
      return state;
    }),

  tickTiempo: () =>
    set((state) => {
      if (state.estado !== "evaluando") return state;

      // Si el tiempo llega a 0, se fuerza la finalización
      const nuevoRestante = Math.max(0, state.tiempoRestante - 1);
      if (nuevoRestante === 0) {
        return {
          tiempoRestante: 0,
          tiempoTranscurrido: state.tiempoTranscurrido + 1,
          estado: "resultados",
        };
      }

      return {
        tiempoRestante: nuevoRestante,
        tiempoTranscurrido: state.tiempoTranscurrido + 1,
      };
    }),

  finalizarEvaluacion: async () => {
    const state = get();
    if (state.estado !== "evaluando" || !state.datosAprendiz) return;

    // Cambiar a un estado de carga mientras recibimos respuesta (opcional, p. ej. "procesando" o simplemente mantenemos evaluando)
    // Para simplificar, enviaremos la solicitud y luego estableceremos "resultados".
    try {
      const resp = await fetch("/api/evaluacion/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: state.datosAprendiz.numeroDocumento,
          nombres: state.datosAprendiz.nombres,
          apellidos: state.datosAprendiz.apellidos,
          respuestasUsuario: state.respuestas,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("Error al finalizar evaluación:", data.error);
        alert(data.error || "Ocurrió un error al enviar la evaluación.");
        // Decide if you want to stay in "evaluando" or force "resultados"
        // set({ estado: "resultados" })
        return;
      }

      // Reemplaza las preguntas seleccionadas (que no tenían respuesta) con las devueltas (que sí tienen respuesta correcta)
      // de esta forma los resultados se mostrarán correctamente.
      set({
        estado: "resultados",
        preguntasSeleccionadas:
          data.preguntasCompletas || state.preguntasSeleccionadas,
      });
    } catch (error) {
      console.error(error);
      alert("Error de red al enviar la evaluación.");
    }
  },

  reiniciarEstado: () => {
    // Limpiar localStorage (Zustand persist key si existe)
    if (typeof window !== "undefined") {
      localStorage.removeItem("evaluacion-storage");
    }
    set({
      datosAprendiz: null,
      preguntasSeleccionadas: [],
      respuestas: {},
      preguntaActualIndex: 0,
      tiempoRestante: 0,
      tiempoTranscurrido: 0,
      estado: "inicio",
    });
  },
}));
