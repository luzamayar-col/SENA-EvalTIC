export const APP_CONFIG = {
  // Datos del instructor
  instructorEmail:
    process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL || "instructor@sena.edu.co",
  nombreInstructor: "Mauricio Alexander Vargas Rodríguez",

  // Datos institucionales
  institution:
    "SENA - Centro de Electricidad, Electrónica y Telecomunicaciones (CEET)",
  sede: "Bogotá D.C.",
  title: "SENA EvalTIC - Evaluación en Línea",

  // Competencia
  competencia: {
    codigo: "38199",
    nombre: "ORIENTAR INVESTIGACIÓN FORMATIVA SEGÚN REFERENTES TÉCNICOS",
  },

  // Resultado de Aprendizaje
  resultadoAprendizaje: {
    codigo: "580873",
    nombre:
      "PROPONER SOLUCIONES A LAS NECESIDADES DEL CONTEXTO SEGÚN RESULTADOS DE LA INVESTIGACIÓN",
  },

  // ═══ PARÁMETROS ACTUALIZADOS ═══
  bancoPreguntasTotal: 50, // Total de preguntas en el banco
  totalQuestions: 10, // Preguntas aleatorias por evaluación
  distribucionPreguntas: {
    seleccion_unica: 5, // 5 de selección única
    seleccion_multiple: 3, // 3 de selección múltiple
    emparejamiento: 2, // 2 de emparejamiento
  },
  timeLimitMinutes: 15,
  passingScorePercentage: 65,
  aleatorizarOpciones: true, // Aleatorizar opciones de respuesta
  permitirRepeticion: false, // NO permitir repetir evaluación

  // Programas de formación
  programasFormacion: [
    "Tecnólogo en Implementación de Infraestructura de Tecnologías de la Información y las Comunicaciones (IITICS)",
    "Tecnólogo en Implementación de Redes y Servicios de Telecomunicaciones (TIRST)",
    "Tecnólogo en Gestión de Redes de Datos (GRD)",
    "Otro Programa",
  ],

  // Servicio de correo
  email: {
    provider: "resend",
    resendApiKey: process.env.RESEND_API_KEY || "",
    senderEmail:
      process.env.NEXT_PUBLIC_SENDER_EMAIL || "evaluaciones@sena-ceet.edu.co",
    fromName: "SENA CEET - Evaluaciones",
  },
} as const;
