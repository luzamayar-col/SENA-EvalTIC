# SENA EvalTIC

Sistema interactivo de evaluación técnica en línea para aprendices del **SENA - Centro de Electricidad, Electrónica y Telecomunicaciones (CEET)**. Permite a los instructores aplicar evaluaciones dinámicas con selección aleatoria de preguntas, control de intentos, temporizador, generación de informes PDF y notificación por correo electrónico.

---

## Características Principales

| Característica              | Descripción                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Evaluación dinámica**     | 10 preguntas aleatorias tomadas de un banco de 50 (5 selección única, 3 selección múltiple, 2 emparejamiento) |
| **Control de intentos**     | Verificación por número de documento — un solo intento por aprendiz                                           |
| **Sin retroceso**           | Una vez respondida una pregunta y avanzado a la siguiente, no es posible regresar                             |
| **Temporizador**            | Límite de 15 minutos con cuenta regresiva visible                                                             |
| **Calificación automática** | Puntaje sobre 100 puntos — nota de corte 65 %                                                                 |
| **Informe PDF**             | Generado en el cliente con jsPDF; incluye datos del aprendiz, competencia, resultados y detalle por pregunta  |
| **Notificación por correo** | Envío automático al instructor vía Resend API al finalizar la evaluación                                      |
| **Modal de inicio**         | Informa la competencia, el resultado de aprendizaje evaluado y las reglas antes de comenzar                   |

---

## Información de la Evaluación

- **Institución:** SENA - Centro de Electricidad, Electrónica y Telecomunicaciones (CEET)
- **Competencia:** `38199` — ORIENTAR INVESTIGACIÓN FORMATIVA SEGÚN REFERENTES TÉCNICOS
- **Resultado de Aprendizaje:** `580873` — PROPONER SOLUCIONES A LAS NECESIDADES DEL CONTEXTO SEGÚN RESULTADOS DE LA INVESTIGACIÓN
- **Programas de formación disponibles:**
  - Tecnólogo en Implementación de Infraestructura de Tecnologías de la Información y las Comunicaciones (IITICS)
  - Tecnólogo en Implementación de Redes y Servicios de Telecomunicaciones (TIRST)
  - Tecnólogo en Gestión de Redes de Datos (GRD)
  - Otro Programa

---

## Pila Tecnológica (Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Estilos:** Tailwind CSS v4 + shadcn/ui
- **Estado global:** Zustand (con middleware de persistencia)
- **Generación PDF:** jsPDF v4 + jspdf-autotable v5 + fuente Noto Sans (local)
- **Correo electrónico:** Resend API
- **Iconos:** Lucide React
- **Formularios:** React Hook Form + Zod
- **Animaciones drag & drop:** @dnd-kit (preguntas de emparejamiento)

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                  # Página de ingreso del aprendiz
│   ├── evaluacion/page.tsx       # Interfaz de la evaluación
│   ├── resultados/page.tsx       # Resumen de resultados y descarga PDF
│   └── api/
│       ├── evaluacion/iniciar/   # Valida intento y crea registro
│       └── evaluacion/finalizar/ # Registra resultado y envía correo
├── components/
│   ├── atoms/                    # Primitivos (botones, inputs, badges)
│   ├── molecules/                # Compuestos (Timer, StartModal, etc.)
│   ├── organisms/                # Secciones (Header, Footer, AboutModal)
│   └── templates/                # Renderizador de preguntas (QuestionRenderer)
├── data/
│   └── preguntas.json            # Banco de 50 preguntas
├── lib/
│   ├── config.ts                 # Parámetros globales de la evaluación
│   ├── pdf-generator.ts          # Generador de informes PDF (jsPDF)
│   ├── score.ts                  # Lógica de calificación
│   └── utils.ts                  # Helpers generales
└── stores/
    └── evaluacion-store.ts       # Estado global (Zustand)

public/
├── assets/logos/                 # Logos institucionales SVG/PNG
└── fonts/
    └── NotoSans-Regular.ttf      # Fuente para el PDF (soporte de tildes y ñ)
```

---

## Configuración y Despliegue

### 1. Clonar e Instalar

```bash
git clone <ruta-al-repositorio>
cd evaluaciones
npm install
```

### 2. Variables de Entorno

Crea `.env.local` en la raíz del proyecto:

```env
# Correo del instructor que recibirá las alertas
NEXT_PUBLIC_INSTRUCTOR_EMAIL=instructor@sena.edu.co

# Correo emisor (configurado como dominio verificado en Resend)
NEXT_PUBLIC_SENDER_EMAIL=evaluaciones@sena-ceet.edu.co

# API Key de Resend (https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
```

### 3. Ejecución en Desarrollo

```bash
npm run dev
# Disponible en http://localhost:3000
```

### 4. Build de Producción

```bash
npm run build
npm start
```

---

## Personalización

Para adaptar la evaluación a una competencia o resultado de aprendizaje diferente, edita `src/lib/config.ts`:

```typescript
competencia: {
  codigo: "38199",
  nombre: "ORIENTAR INVESTIGACIÓN FORMATIVA SEGÚN REFERENTES TÉCNICOS",
},
resultadoAprendizaje: {
  codigo: "580873",
  nombre: "PROPONER SOLUCIONES A LAS NECESIDADES DEL CONTEXTO...",
},
totalQuestions: 10,         // Total de preguntas por evaluación
timeLimitMinutes: 15,       // Tiempo límite
passingScorePercentage: 65, // Nota mínima de aprobación (%)
```

El banco de preguntas se gestiona en `src/data/preguntas.json`. Soporta tres tipos:

- `seleccion_unica` — una sola respuesta correcta
- `seleccion_multiple` — varias respuestas correctas
- `emparejamiento` — pares concepto ↔ definición

---

## Notas Técnicas

- **Fuente PDF:** `public/fonts/NotoSans-Regular.ttf` es necesaria para renderizar correctamente tildes (á, é, ó, ú) y caracteres especiales (ñ, Ñ) en el informe PDF. No eliminar este archivo.
- **Control de intentos:** Los intentos se almacenan en la API Route `/api/evaluacion/iniciar`. En entorno de desarrollo puedes limpiar el estado de Zustand desde las DevTools del navegador para presentar la evaluación nuevamente.
- **Opciones aleatorizadas:** Las opciones de respuesta se mezclan en cada sesión (`aleatorizarOpciones: true`) para evitar que los aprendices memoricen posiciones.
