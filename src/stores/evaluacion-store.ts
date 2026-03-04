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

export interface AprendizInfo {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  email: string | null;
  programa: string;
  competencia: string;
  resultadoAprendizaje: string;
}

export interface RespuestaAprendiz {
  preguntaId: string;
  respuestaIds?: string[];
  emparejamientos?: Record<string, string>;
}

export interface EvaluacionState {
  datosAprendiz: DatosAprendiz | null;
  preguntasDisponibles: any[];
  preguntasSeleccionadas: any[];
  respuestas: Record<string, RespuestaAprendiz>;
  preguntaActualIndex: number;
  tiempoRestante: number;
  tiempoTranscurrido: number;
  resultado: EvaluacionResultado | null;
  estado: "inicio" | "evaluando" | "resultados";

  // IDs de DB
  fichaId: string | null;
  evaluacionId: string | null;

  // Nuevos campos
  intentoNumero: number | null;
  testMode: boolean;
  aprendizInfo: AprendizInfo | null;

  // Acciones
  setDatosAprendiz: (datos: DatosAprendiz) => void;
  iniciarEvaluacion: (
    preguntasSeleccionadas: any[],
    tiempoRestante: number,
    fichaId?: string | null,
    evaluacionId?: string | null,
    intentoNumero?: number | null,
    aprendizInfo?: AprendizInfo | null,
    testMode?: boolean,
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
  fichaId: null,
  evaluacionId: null,
  intentoNumero: null,
  testMode: false,
  aprendizInfo: null,

  setDatosAprendiz: (datos) => set({ datosAprendiz: datos }),

  iniciarEvaluacion: (
    preguntas,
    tiempo,
    fichaId = null,
    evaluacionId = null,
    intentoNumero = null,
    aprendizInfo = null,
    testMode = false,
  ) => {
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
      fichaId,
      evaluacionId,
      intentoNumero,
      aprendizInfo,
      testMode,
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
      return {
        tiempoRestante: Math.max(0, state.tiempoRestante - 1),
        tiempoTranscurrido: state.tiempoTranscurrido + 1,
      };
    }),

  finalizarEvaluacion: async () => {
    const state = get();
    if (state.estado !== "evaluando") return;
    // In test mode datosAprendiz may be null; allow it through
    if (!state.testMode && !state.datosAprendiz) return;

    const ai = state.aprendizInfo;
    try {
      const resp = await fetch("/api/evaluacion/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: state.datosAprendiz?.numeroDocumento ?? ai?.nombres ?? "instructor",
          tipoDocumento: state.datosAprendiz?.tipoDocumento ?? ai?.tipoDocumento ?? "CC",
          nombres: state.datosAprendiz?.nombres ?? ai?.nombres ?? "",
          apellidos: state.datosAprendiz?.apellidos ?? ai?.apellidos ?? "",
          email: state.datosAprendiz?.correo ?? ai?.email ?? "",
          programaFormacion: state.datosAprendiz?.programaFormacion ?? ai?.programa ?? "",
          respuestasUsuario: state.respuestas,
          fichaId: state.fichaId,
          evaluacionId: state.evaluacionId,
          tiempoUsado: state.tiempoTranscurrido,
          intentoNumero: state.intentoNumero,
          esPrueba: state.testMode,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("Error al finalizar evaluación:", data.error);
        alert(data.error || "Ocurrió un error al enviar la evaluación.");
        return;
      }

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
      fichaId: null,
      evaluacionId: null,
      intentoNumero: null,
      testMode: false,
      aprendizInfo: null,
    });
  },
}));
