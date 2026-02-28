/**
 * Implementación del algoritmo Fisher-Yates para mezclar arrays
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Mezcla y selecciona un total específico de preguntas desde el banco.
 * También mezcla las opciones de respuesta dentro de cada pregunta de selección.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shuffleQuestions(questionsPool: any[], count: number): any[] {
  // 1. Randomizar todo el banco de preguntas
  const mixedPool = shuffleArray(questionsPool);

  // 2. Tomar las N preguntas requeridas
  const selected = mixedPool.slice(0, count);

  // 3. Randomizar opciones internas para evitar patrones memorizables
  return selected.map((q) => {
    // Clonar profunda para no mutar el JSON original importado
    const question = JSON.parse(JSON.stringify(q));

    if (
      question.tipo === "seleccion_unica" ||
      question.tipo === "seleccion_multiple"
    ) {
      if (question.opciones) {
        question.opciones = shuffleArray(question.opciones);
      }
    }

    if (question.tipo === "emparejamiento") {
      if (question.opciones) {
        // En emparejamiento, a veces es útil mezclar las opciones derechas,
        // pero por simplicidad de UI, si ya están como array, las mezclamos.
        question.opciones = shuffleArray(question.opciones);
      }
    }

    return question;
  });
}
