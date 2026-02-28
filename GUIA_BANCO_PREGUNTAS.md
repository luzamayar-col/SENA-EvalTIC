# Guía para IA: Creación del Banco de Preguntas

> Este documento describe exactamente cómo una IA debe generar el archivo `src/data/preguntas.json`
> y actualizar `src/lib/config.ts` para reutilizar la aplicación SENA EvalTIC en cualquier
> competencia o resultado de aprendizaje diferente.

---

## 1. Contexto de la aplicación

La aplicación selecciona **10 preguntas aleatorias** de un banco cada vez que un aprendiz inicia
la evaluación, respetando esta distribución fija:

| Tipo | Cantidad por evaluación | Mínimo recomendado en el banco |
|---|---|---|
| `seleccion_unica` | 5 | 20 |
| `seleccion_multiple` | 3 | 15 |
| `emparejamiento` | 2 | 8 |
| **Total** | **10** | **43 +** |

> El banco actual tiene 50 preguntas. Mantener al menos ese volumen garantiza variedad
> suficiente entre evaluaciones distintas del mismo aprendiz.

---

## 2. Archivos que deben modificarse

### 2.1 `src/lib/config.ts`

Actualiza los campos institucionales y pedagógicos **antes** de generar las preguntas.
Estos valores se imprimen en el encabezado, el informe PDF y el correo de notificación.

```ts
export const APP_CONFIG = {
  // ── Instructor ──────────────────────────────────────────────────────────
  instructorEmail: "instructor@dominio.edu.co",
  nombreInstructor: "Nombre completo del instructor",

  // ── Institución ─────────────────────────────────────────────────────────
  institution: "SENA - Nombre del Centro",
  sede: "Ciudad, Departamento",
  title: "Nombre del sistema - Evaluación en Línea",

  // ── Competencia SENA ────────────────────────────────────────────────────
  competencia: {
    codigo: "XXXXX",           // Código numérico de la competencia
    nombre: "NOMBRE COMPLETO DE LA COMPETENCIA EN MAYÚSCULAS",
  },

  // ── Resultado de Aprendizaje ─────────────────────────────────────────────
  resultadoAprendizaje: {
    codigo: "XXXXXX",          // Código numérico del resultado
    nombre: "DESCRIPCIÓN COMPLETA DEL RESULTADO DE APRENDIZAJE EN MAYÚSCULAS",
  },

  // ── Parámetros de evaluación ─────────────────────────────────────────────
  bancoPreguntasTotal: 50,     // Total de preguntas en preguntas.json
  totalQuestions: 10,          // Preguntas seleccionadas por evaluación
  distribucionPreguntas: {
    seleccion_unica: 5,
    seleccion_multiple: 3,
    emparejamiento: 2,
  },
  timeLimitMinutes: 15,        // Tiempo límite en minutos
  passingScorePercentage: 65,  // Porcentaje mínimo para aprobar (0–100)
  aleatorizarOpciones: true,   // true = mezcla opciones en cada evaluación
  permitirRepeticion: false,   // false = un solo intento por cédula

  // ── Programas de formación ────────────────────────────────────────────────
  programasFormacion: [
    "Nombre del programa 1",
    "Nombre del programa 2",
    "Otro Programa",            // Siempre mantener esta opción al final
  ],
};
```

---

### 2.2 `src/data/preguntas.json`

Estructura raíz del archivo:

```json
{
  "meta": { ... },
  "preguntas": [ ... ]
}
```

#### Objeto `meta`

Debe ser **coherente** con los valores de `config.ts`. Se usa como referencia documental.

```json
"meta": {
  "version": "1.0.0",
  "competencia": {
    "codigo": "XXXXX",
    "nombre": "NOMBRE COMPLETO DE LA COMPETENCIA"
  },
  "resultadoAprendizaje": {
    "codigo": "XXXXXX",
    "nombre": "DESCRIPCIÓN DEL RESULTADO DE APRENDIZAJE"
  },
  "programaFormacion": "Nombre del programa principal",
  "codigoPrograma": "XXXXXX vX",
  "tiempoLimiteMinutos": 15,
  "porcentajeAprobacion": 65,
  "totalPreguntas": 50
}
```

---

## 3. Tipos de pregunta

### 3.1 `seleccion_unica` — Selección única

El aprendiz elige **exactamente una** opción correcta.

**Esquema:**

```json
{
  "id": 1,
  "tipo": "seleccion_unica",
  "tema": "Nombre del área temática",
  "enunciado": "Texto completo de la pregunta en forma interrogativa o afirmativa.",
  "opciones": [
    { "id": "a", "texto": "Primera opción de respuesta" },
    { "id": "b", "texto": "Segunda opción de respuesta" },
    { "id": "c", "texto": "Tercera opción de respuesta" },
    { "id": "d", "texto": "Cuarta opción de respuesta" }
  ],
  "respuestaCorrecta": ["b"],
  "retroalimentacion": "Explicación pedagógica de por qué la opción correcta es la correcta y por qué las demás no lo son."
}
```

**Reglas:**
- `respuestaCorrecta` es siempre un **array con un único elemento**.
- Mínimo 3 opciones, recomendado **4**.
- Los `id` de opciones deben ser letras minúsculas consecutivas: `"a"`, `"b"`, `"c"`, `"d"` (hasta `"e"` si se necesita una quinta opción).
- Los distractores deben ser plausibles —no deben ser obviamente incorrectos.

---

### 3.2 `seleccion_multiple` — Selección múltiple

El aprendiz puede elegir **dos o más** opciones correctas.

**Esquema:**

```json
{
  "id": 11,
  "tipo": "seleccion_multiple",
  "tema": "Características del proceso investigativo",
  "enunciado": "Seleccione las características que definen al proceso investigativo según los fundamentos estudiados:",
  "opciones": [
    { "id": "a", "texto": "Es consciente: implica una búsqueda intencional y deliberada" },
    { "id": "b", "texto": "Es aleatorio: no requiere seguir una estructura definida" },
    { "id": "c", "texto": "Es organizado: tiene una estructura clara y secuencial" },
    { "id": "d", "texto": "Es metodológico: sigue procedimientos validados" },
    { "id": "e", "texto": "Es subjetivo: depende exclusivamente de las opiniones del investigador" }
  ],
  "respuestaCorrecta": ["a", "c", "d"],
  "retroalimentacion": "El proceso investigativo se caracteriza por ser consciente, organizado y metodológico. Las opciones b y e son incorrectas porque describen lo opuesto a sus principios fundamentales."
}
```

**Reglas:**
- `respuestaCorrecta` contiene **entre 2 y 4** elementos. Nunca 1 (eso sería selección única) ni todos (eso no evalúa nada).
- Recomendado **5 opciones** (a–e) para que haya suficientes distractores.
- El enunciado debe indicar explícitamente que se pueden elegir varias: use "Seleccione todas las que apliquen" o "Identifique las opciones correctas".
- La retroalimentación debe explicar **por qué** los distractores son incorrectos, no solo cuáles son correctos.

---

### 3.3 `emparejamiento` — Emparejamiento

El aprendiz asocia cada concepto de la columna izquierda con su definición/descripción de la columna derecha.

**Esquema:**

```json
{
  "id": 21,
  "tipo": "emparejamiento",
  "tema": "Tipos de conocimiento",
  "enunciado": "Empareje cada tipo de conocimiento con su ejemplo aplicado al campo de las redes y telecomunicaciones:",
  "pares": [
    {
      "izquierda": "Conocimiento empírico",
      "derecha": "Aprender a configurar un router practicando repetidamente e identificando patrones de comportamiento"
    },
    {
      "izquierda": "Conocimiento científico",
      "derecha": "Conocer los principios de TCP/IP a partir de estudios experimentales documentados en RFCs"
    },
    {
      "izquierda": "Conocimiento intuitivo",
      "derecha": "Intuir la causa de un problema de conectividad basándose en experiencia previa sin explicación inmediata"
    },
    {
      "izquierda": "Conocimiento filosófico",
      "derecha": "Razonamiento sobre principios lógicos de diseño de arquitecturas de red"
    }
  ],
  "retroalimentacion": "Empírico: experiencia directa. Científico: métodos sistemáticos y evidencia. Intuitivo: patrones reconocidos inconscientemente. Filosófico: reflexión lógica y razonamiento abstracto."
}
```

**Reglas críticas:**
- **NO incluir** el campo `respuestaCorrecta` ni `opciones`. La respuesta correcta se deriva automáticamente de los `pares`.
- Cada objeto en `pares` tiene exactamente dos campos: `"izquierda"` y `"derecha"`.
- Recomendado **4 pares** por pregunta (mínimo 3, máximo 5).
- Todos los valores de `"derecha"` deben ser únicos entre sí —no puede haber dos definiciones iguales en la misma pregunta.
- Los textos de `"izquierda"` (conceptos) deben ser concisos (1–5 palabras). Los de `"derecha"` (definiciones) pueden ser más extensos.
- La aplicación mezcla automáticamente las opciones de la derecha; el aprendiz ve los conceptos fijos a la izquierda y selecciona la definición correcta en un desplegable.

---

## 4. Reglas globales del banco

### 4.1 Identificadores (`id`)

- Son **enteros positivos únicos** en todo el archivo.
- Se recomienda numerarlos correlativamente: 1–20 para `seleccion_unica`, 21–40 para `seleccion_multiple`, 41–50 para `emparejamiento`. Esto facilita el mantenimiento, aunque el sistema no requiere este orden.

### 4.2 Temas (`tema`)

El campo `tema` es fundamental: la aplicación lo usa para calcular y mostrar el **"Desempeño por Área Temática"** en el informe PDF y en la página de resultados.

- Usa nombres de área **cortos y consistentes** (máximo 40 caracteres).
- El mismo nombre de tema debe escribirse **exactamente igual** en todas las preguntas que pertenezcan a esa área (respetando mayúsculas, tildes y espacios).
- Distribuye las preguntas del banco de modo que **ningún tema quede con menos de 3 preguntas**, para que la estadística por área sea significativa.
- Ejemplo de temas bien definidos:

```
"Fundamentos de investigación"
"Proceso investigativo"
"Tipos de conocimiento"
"SENNOVA"
"Matriz de Vester"
"Árbol de problemas"
"Objetivos SMART"
"Marco lógico"
"Técnicas de recolección de datos"
"Ética en investigación"
```

### 4.3 Enunciados

- Deben redactarse en español neutro, sin errores ortográficos.
- Evitar el doble negativo ("¿Cuál NO es incorrecta?").
- Para `seleccion_unica` y `seleccion_multiple`: terminar con `?` si es pregunta, o en punto si es afirmación incompleta que se completa con las opciones.
- Para `emparejamiento`: iniciar con "Empareje…", "Relacione…" o "Asocie…".
- Máximo recomendado: **300 caracteres** por enunciado (textos más largos pueden cortarse en el PDF).

### 4.4 Retroalimentación (`retroalimentacion`)

Este campo es **obligatorio** y es la base de las recomendaciones personalizadas del informe.

- Explica el concepto correcto con lenguaje pedagógico.
- Para `seleccion_unica` y `seleccion_multiple`: explica por qué la respuesta correcta es válida y, si es posible, por qué las opciones incorrectas más plausibles no lo son.
- Para `emparejamiento`: resume el criterio de clasificación que une todos los pares.
- Longitud recomendada: **1–3 oraciones** (100–250 caracteres).
- No repetir textualmente el enunciado; agregar valor explicativo.

### 4.5 Distribución por tipo en el banco

La aplicación selecciona por tipo de forma independiente. Si el banco tiene menos preguntas de un tipo que las requeridas por evaluación, el sistema fallará. Mantén siempre:

```
seleccion_unica    ≥ 15  (5 por evaluación × 3 de margen)
seleccion_multiple ≥ 9   (3 por evaluación × 3 de margen)
emparejamiento     ≥ 6   (2 por evaluación × 3 de margen)
```

---

## 5. Plantilla vacía para cada tipo

### `seleccion_unica`

```json
{
  "id": 0,
  "tipo": "seleccion_unica",
  "tema": "",
  "enunciado": "",
  "opciones": [
    { "id": "a", "texto": "" },
    { "id": "b", "texto": "" },
    { "id": "c", "texto": "" },
    { "id": "d", "texto": "" }
  ],
  "respuestaCorrecta": [""],
  "retroalimentacion": ""
}
```

### `seleccion_multiple`

```json
{
  "id": 0,
  "tipo": "seleccion_multiple",
  "tema": "",
  "enunciado": "",
  "opciones": [
    { "id": "a", "texto": "" },
    { "id": "b", "texto": "" },
    { "id": "c", "texto": "" },
    { "id": "d", "texto": "" },
    { "id": "e", "texto": "" }
  ],
  "respuestaCorrecta": ["", ""],
  "retroalimentacion": ""
}
```

### `emparejamiento`

```json
{
  "id": 0,
  "tipo": "emparejamiento",
  "tema": "",
  "enunciado": "",
  "pares": [
    { "izquierda": "", "derecha": "" },
    { "izquierda": "", "derecha": "" },
    { "izquierda": "", "derecha": "" },
    { "izquierda": "", "derecha": "" }
  ],
  "retroalimentacion": ""
}
```

---

## 6. Errores comunes que debes evitar

| Error | Por qué es problema | Solución |
|---|---|---|
| `respuestaCorrecta` en una pregunta de emparejamiento | El campo no existe en ese tipo; la app lo ignora pero genera confusión | Eliminar el campo |
| `pares` u `opciones` ausentes | La app lanza error en tiempo de ejecución | Verificar que cada tipo tenga su campo propio |
| IDs de pregunta repetidos | El sistema indexa respuestas por `id`; duplicados corrompen las respuestas del aprendiz | Numerar correlativamente y verificar unicidad |
| IDs de opción repetidos en la misma pregunta (ej. dos `"a"`) | La selección del aprendiz puede apuntar a la opción equivocada | Usar letras únicas y consecutivas |
| `respuestaCorrecta` con un ID que no existe en `opciones` | La pregunta nunca se marcará como correcta | Cruzar el valor contra los `id` de `opciones` |
| Nombre de `tema` inconsistente (ej. "SENNOVA" vs "Sennova") | Se generan dos áreas temáticas distintas en el informe | Definir un glosario de temas y copiar exactamente |
| Retroalimentación vacía (`""`) | La sección de recomendaciones del informe queda sin contenido para ese tema | Siempre redactar al menos una oración |
| Menos preguntas de un tipo que las requeridas | La API `/api/evaluacion/iniciar` no puede seleccionar las preguntas y devuelve error | Verificar los mínimos por tipo |

---

## 7. Checklist de validación antes de publicar

Antes de guardar el archivo `preguntas.json` definitivo, verifica cada punto:

- [ ] El objeto `meta` coincide con los valores de `config.ts`
- [ ] Todos los `id` de pregunta son enteros únicos y positivos
- [ ] El banco tiene al menos 20 preguntas de `seleccion_unica`
- [ ] El banco tiene al menos 9 preguntas de `seleccion_multiple`
- [ ] El banco tiene al menos 6 preguntas de `emparejamiento`
- [ ] Ninguna pregunta de `seleccion_unica` o `seleccion_multiple` tiene el campo `pares`
- [ ] Ninguna pregunta de `emparejamiento` tiene los campos `opciones` o `respuestaCorrecta`
- [ ] En cada pregunta de selección, `respuestaCorrecta` contiene solo IDs que existen en `opciones`
- [ ] En `seleccion_unica`, `respuestaCorrecta` tiene exactamente 1 elemento
- [ ] En `seleccion_multiple`, `respuestaCorrecta` tiene entre 2 y 4 elementos
- [ ] Ningún `tema` se repite con diferente capitalización o tildes
- [ ] Todos los campos `retroalimentacion` tienen texto (no cadena vacía)
- [ ] El JSON es válido (sin comas finales, comillas correctas, llaves balanceadas)

---

## 8. Prompt sugerido para pedirle a la IA el banco completo

```
Actúa como experto en diseño instruccional SENA. Genera el archivo completo
src/data/preguntas.json para la siguiente evaluación:

Competencia: [CÓDIGO] - [NOMBRE DE LA COMPETENCIA]
Resultado de Aprendizaje: [CÓDIGO] - [NOMBRE DEL RESULTADO]
Programa de Formación: [NOMBRE DEL PROGRAMA]
Áreas temáticas a evaluar: [lista de 8-10 temas]

Requisitos del banco:
- 20 preguntas de seleccion_unica (IDs 1-20)
- 15 preguntas de seleccion_multiple (IDs 21-35)
- 8 preguntas de emparejamiento (IDs 36-43, con 4 pares cada una)
- Total: 43 preguntas mínimo

Reglas obligatorias:
1. Las preguntas de emparejamiento NO deben tener "respuestaCorrecta" ni "opciones"
2. Las preguntas de selección NO deben tener "pares"
3. respuestaCorrecta es siempre un array (["b"] para única, ["a","c"] para múltiple)
4. Los temas deben escribirse exactamente igual en todas las preguntas de esa área
5. Cada retroalimentacion debe tener entre 100 y 250 caracteres
6. Los distractores en selección única deben ser plausibles, no absurdos
7. En selección múltiple usar 5 opciones (a-e), con 2-3 respuestas correctas
8. En emparejamiento usar exactamente 4 pares por pregunta

Devuelve el JSON completo y válido siguiendo la estructura de este documento.
```

---

*Documento generado para el proyecto SENA EvalTIC — `src/data/preguntas.json` v1.0*
