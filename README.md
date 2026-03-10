# SENA EvalTIC

Sistema interactivo de evaluación técnica en línea para aprendices del **SENA - Centro de Electricidad, Electrónica y Telecomunicaciones (CEET)**. Permite a los instructores aplicar evaluaciones dinámicas con selección aleatoria de preguntas, control de intentos múltiples, temporizador, generación de informes PDF, notificación por correo electrónico y un **panel de administración completo** para gestionar evaluaciones, fichas de aprendices, resultados e importación masiva desde SOFIA Plus.

---

## Características Principales

| Característica              | Descripción                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Evaluación dinámica**     | Preguntas aleatorias del banco (configurable: sel. única, sel. múltiple, emparejamiento)                                   |
| **Validación por cédula**   | Flujo de dos pasos: validar cédula + ficha → confirmar datos → iniciar                                                      |
| **Control de intentos**     | Máx. intentos configurables por evaluación + intentos extra por aprendiz; se persisten en Neon Postgres                     |
| **Sin retroceso**           | Una vez respondida una pregunta y avanzado, no es posible regresar                                                          |
| **Temporizador**            | Límite configurable en minutos con cuenta regresiva visible                                                                  |
| **Calificación automática** | Puntaje sobre 100 — nota de corte configurable (65 % por defecto)                                                           |
| **Informe PDF**             | Generado en el cliente; incluye iconos SVG vectorizados, respuestas correctas, retroalimentación y desglose                 |
| **Notificación por correo** | Envío automático al instructor vía Resend API con CC al aprendiz                                                            |
| **Interfaz Móvil**          | Diseño responsive con modales optimizados para pantallas pequeñas                                                           |
| **Panel del instructor**    | Dashboard con métricas, gestión completa de evaluaciones, fichas, aprendices, resultados y exportación Excel                |
| **Modo prueba**             | El instructor puede presentar la evaluación en modo prueba — los resultados no se guardan                                   |
| **Editor de preguntas**     | Interfaz visual drag-and-drop para editar, reordenar y crear preguntas del banco                                            |
| **Importación SOFIA Plus**  | Importar aprendices desde el Excel de SOFIA Plus (detección automática de columnas)                                         |
| **Exportación Excel**       | Resultados exportables en `.xlsx` con dos hojas (Resultados y Resumen)                                                      |
| **Antiplagio**              | Bloqueo de copia/captura; blur inmediato al perder foco (Win+Shift+S); marca de agua personalizada en PDF                   |
| **Crédito parcial**         | Selección múltiple y emparejamiento otorgan puntos proporcionales a las opciones/pares correctos seleccionados               |
| **Puntajes con decimales**  | `puntaje` almacenado como `Float`; se muestra con 1 decimal cuando hay crédito parcial (ej. 72.5%); aciertos ponderados (7.3/10) |
| **Descarga PDF por aprendiz** | El instructor puede descargar el informe PDF del último intento de cada aprendiz directamente desde la tabla de la ficha   |
| **Descarga PDF pública**    | El aprendiz que agotó sus intentos puede descargar su propio informe desde la pantalla de verificación (sin cuenta)         |
| **Autenticación**           | NextAuth v4 con credenciales (email + contraseña bcrypt) — solo instructores autorizados                                   |

---

## Pila Tecnológica (Stack)

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack) + React 19 |
| Estilos | Tailwind CSS v4 + shadcn/ui (new-york) |
| Base de datos | Neon Postgres (serverless) vía Prisma 7 + `@prisma/adapter-neon` |
| Autenticación | NextAuth v4 (CredentialsProvider, JWT) |
| Estado global | Zustand 5 |
| Formularios | React Hook Form 7 + Zod 4 |
| Correo electrónico | Resend API |
| Generación PDF | jsPDF v4 + jspdf-autotable v5 |
| Importación/Exportación | SheetJS (xlsx) |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Iconos | Lucide React |

---

## Arquitectura y Estructura

```
prisma/
├── schema.prisma             # Modelos DB: Instructor, Evaluacion, Ficha, Aprendiz, Resultado
├── seed.ts                   # Crea el primer instructor + evaluación inicial
└── migrations/               # Historial de migraciones

src/
├── app/
│   ├── (public)/             # Rutas del aprendiz (Header + Footer)
│   │   ├── page.tsx          # Registro: validar cédula+ficha → confirmar → iniciar
│   │   ├── evaluacion/       # Interfaz de la evaluación (con banner modo prueba)
│   │   └── resultados/       # Resumen, PDF y correo
│   ├── instructor/
│   │   ├── (auth)/login/     # Página de inicio de sesión
│   │   └── (protected)/      # Panel protegido por middleware
│   │       ├── dashboard/    # KPIs globales
│   │       ├── evaluaciones/ # CRUD evaluaciones + editor de preguntas
│   │       ├── fichas/       # CRUD fichas + detalle por ficha
│   │       │   └── [id]/     # Detalle: aprendices, estadísticas, resultados
│   │       ├── resultados/   # Resultados paginados + export Excel/CSV
│   │       └── instructores/ # Gestión de instructores (solo admin)
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── evaluacion/
│       │   ├── iniciar/               # Valida roster, cuenta intentos, retorna preguntas
│       │   ├── finalizar/             # Registra resultado (o descarta si esPrueba)
│       │   ├── validar-aprendiz/      # GET: busca aprendiz en roster por cédula+ficha; retorna ultimoResultadoId si agotó intentos
│       │   ├── pdf-resultado/[id]/    # GET público: datos PDF del resultado (verificado por cédula)
│       │   └── validar-ficha/         # GET: valida que la ficha tenga evaluación activa
│       └── instructor/
│           ├── evaluaciones/          # CRUD + toggle activa
│           │   └── [id]/prueba/       # POST: inicia modo prueba (sin guardar resultado)
│           ├── fichas/
│           │   └── [id]/
│           │       ├── aprendices/    # GET list + POST single/bulk import
│           │       └── stats/         # Métricas de la ficha
│           ├── aprendices/
│           │   └── [id]/
│           │       ├── route.ts       # PUT editar, DELETE eliminar
│           │       └── intentos/      # PATCH conceder intentos extra
│           ├── resultados/
│           │   ├── export/            # CSV
│           │   └── export-excel/      # XLSX (dos hojas: Resultados + Resumen)
│           └── templates/[type]/      # GET plantillas descargables (aprendices.xlsx, preguntas.json)
├── components/
│   ├── organisms/            # Header, tablas CRUD, PreguntasEditor, FichaDetailClient
│   ├── molecules/            # Diálogos, badges, filtros, ExcelUploader, JsonUploader
│   ├── templates/            # FormularioRegistro (2 pasos), EvaluacionFormTemplate
│   └── providers/            # SessionProvider
├── lib/
│   ├── prisma.ts             # Singleton PrismaClient con PrismaNeonHttp
│   ├── auth.ts               # authOptions (NextAuth)
│   ├── auth-utils.ts         # requireInstructor() — guard server-side
│   ├── config.ts             # APP_CONFIG (feature flag, parámetros)
│   ├── score.ts              # calcularPuntaje()
│   └── shuffle.ts            # shuffleQuestions()
├── stores/
│   └── evaluacion-store.ts   # Estado global: preguntas, respuestas, testMode, aprendizInfo
└── types/
    └── preguntas.ts          # Tipos TS para el banco de preguntas

public/
├── assets/logos/             # Logos institucionales SVG/PNG
└── fonts/                    # NotoSans para el PDF
```

---

## Modelos de Base de Datos

```prisma
Instructor      → tiene Evaluacion[]
Evaluacion      → tiene Ficha[], Resultado[]  (maxIntentos configurable)
Ficha           → tiene Aprendiz[], Resultado[]
Aprendiz        → cédula + intentosExtra por ficha
Resultado       → intento (1,2,3...) + esPrueba (true/false)
```

- **Aprendiz**: los aprendices deben estar pre-cargados en la ficha antes de poder presentar la evaluación.
- **Resultado.intento**: permite múltiples intentos (`@@unique([cedula, evaluacionId, intento])`).
- **Resultado.esPrueba**: si `true`, el resultado no se registró desde el flujo de aprendiz.

---

## Configuración y Despliegue

### 1. Clonar e Instalar

```bash
git clone <ruta-al-repositorio>
cd evaluaciones
npm install
```

### 2. Crear base de datos en Neon

1. Ir a [console.neon.tech](https://console.neon.tech) → **New Project**
2. Copiar la **Connection string** → usarla como `DATABASE_URL`

### 3. Variables de Entorno

Crear `.env.local` en la raíz del proyecto (ver `.env.example` para plantilla):

```env
# Base de datos Neon Postgres
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require

# NextAuth
NEXTAUTH_SECRET=<32-bytes-hex>
NEXTAUTH_URL=http://localhost:3000

# Contraseña del primer instructor (solo para el seed inicial)
INSTRUCTOR_SEED_PASSWORD=tu-contraseña-segura

# Feature flag: "true" activa el backend Neon; "false" usa el flujo JSON legacy
NEXT_PUBLIC_USE_DB_BACKEND="true"

# Resend: NO se necesita variable global — cada instructor configura
# su propia API key desde el panel en /instructor/perfil
```

### 4. Migrar la base de datos y crear el primer instructor

```bash
# Aplica el esquema en Neon (entorno sin TTY como CI o Git Bash)
npx prisma db push

# Genera el cliente TypeScript
npx prisma generate

# Crea instructor admin + evaluación inicial + ficha de ejemplo
npx prisma db seed
```

> En entornos interactivos (terminal estándar) puedes usar `npx prisma migrate dev --name init` en lugar de `db push`.

**Credenciales del seed:**
- Email: `mvargasr@sena.edu.co`
- Contraseña: valor de `INSTRUCTOR_SEED_PASSWORD` en `.env.local`
- Panel: `http://localhost:3000/instructor/login`

### 5. Ejecución en Desarrollo

```bash
npm run dev
# Disponible en http://localhost:3000
```

### 6. Build de Producción

```bash
npm run build
npm start
```

---

## Panel del Instructor

Acceso en `/instructor/login`. Incluye enlace **← Volver al inicio** para regresar a la página pública. Solo para instructores registrados.

### Dashboard
- Métricas globales: total resultados, tasa de aprobación, puntaje promedio, evaluaciones activas

### Evaluaciones
- Crear/editar evaluaciones con banco de preguntas (subir `.json` o usar el editor visual)
- Configurar: tiempo límite, % para aprobar, **máx. intentos**, distribución de tipos de pregunta
- **Editor de preguntas** (`/instructor/evaluaciones/[id]/preguntas`): drag-reorder, crear/editar/eliminar preguntas de los 3 tipos
- **Modo prueba** (botón ⚗): el instructor presenta la evaluación sin guardar resultado; muestra banner ámbar
- Activar/desactivar + fechas de vigencia por evaluación

### Fichas
- CRUD completo (crear, editar, eliminar)
- Número de ficha con link al **detalle de ficha** (`/instructor/fichas/[id]`)
- Activar/desactivar por ficha independientemente de la evaluación

### Detalle de Ficha (`/instructor/fichas/[id]`)
- **4 métricas**: total aprendices, presentaciones, tasa aprobación, promedio puntaje
- **Tab Aprendices**: tabla con cédula, nombre, intentos (X/Y), último resultado
  - Agregar aprendiz individual
  - Importar desde Excel SOFIA Plus (detección automática de columnas)
  - Descargar plantilla `.xlsx`
  - Conceder intentos extra (+1) por aprendiz
  - Editar/eliminar aprendices
  - Descargar informe PDF del último intento por aprendiz (ícono ↓)
- **Tab Resultados**: tabla de presentaciones + exportar Excel

### Resultados
- Tabla paginada con filtros por evaluación, ficha y resultado
- **Exportar Excel** (`.xlsx`, dos hojas: Resultados y Resumen)
- Exportar CSV (legacy)

### Instructores _(solo admin)_
- Listar, crear, editar y eliminar instructores
- Cada instructor gestiona sus propias evaluaciones

---

## Flujo del Aprendiz

1. Va a la raíz `/`
2. Selecciona ficha en el dropdown (solo fichas activas con evaluación dentro de vigencia)
3. Ingresa su número de cédula → sistema valida contra el roster
4. Ve pantalla de confirmación con nombre, ficha, competencia, RA e intentos restantes
5. Ingresa (o confirma) su correo
6. Inicia evaluación → responde preguntas → finaliza
7. Ve resultados con PDF descargable y correo enviado al instructor (CC al aprendiz)

**Si el aprendiz ya agotó sus intentos:**
En el paso 4 se muestra el mensaje de intentos agotados y, si existe un resultado previo, aparece el botón **"Descargar mi informe (último intento)"** que genera el PDF directamente en el cliente sin necesidad de cuenta. La seguridad se garantiza verificando que la cédula ingresada coincida con la del resultado en la BD.

---

## Roles y Seguridad

| Rol | Acceso |
|---|---|
| **Admin** | Todas las secciones + gestión de instructores |
| **Instructor** | Dashboard, sus evaluaciones, fichas, aprendices, resultados |
| **Aprendiz** | Flujo público: validar cédula → evaluación → resultados |

- Las rutas `/instructor/(protected)/**` están protegidas por middleware NextAuth
- Las APIs `/api/instructor/**` verifican sesión con `requireInstructor()`
- Contraseñas hasheadas con bcryptjs (cost 12)
- El modo prueba requiere token JWT de instructor para finalizar (no puede ser falsificado)

---

## Notas Técnicas

### Prisma 7 con Neon HTTP
La URL de la DB **no va** en `schema.prisma` (Prisma 7 breaking change). Va en `prisma.config.ts`:
```ts
datasource: { url: process.env.DATABASE_URL! }
```
El cliente en runtime usa `PrismaNeonHttp` (HTTP serverless, compatible con Vercel Edge):
```ts
const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});
const prisma = new PrismaClient({ adapter });
```
> `PrismaNeonHttp` no soporta transacciones — usar `findFirst` + `create` en lugar de `upsert`.

### Zod v4 con React Hook Form
`z.coerce.number()` causa incompatibilidad de tipos en Zod v4. Usar:
```ts
z.number() + onChange={(e) => field.onChange(e.target.valueAsNumber)}
```

### Feature Flag `NEXT_PUBLIC_USE_DB_BACKEND`
- `false` (legacy): lee archivos JSON locales — flujo original sin base de datos
- `true` (DB): valida aprendiz en roster, cuenta intentos, registra resultado en Neon
- Debe ser `NEXT_PUBLIC_` para que sea consistente entre server y client (evita hydration mismatch)

### Importación SOFIA Plus
El parser detecta automáticamente la fila de encabezados (busca en las primeras 20 filas la que contenga ≥2 palabras clave de: cédula, nombres, apellidos, tipo, documento). Compatible con el formato de exportación de SOFIA Plus.

### PDF y Fuentes
`public/fonts/NotoSans-Regular.ttf` es necesaria para renderizar tildes (á, é) y ñ en el informe PDF.

### Medidas Antiplagio

**Durante la evaluación (`/evaluacion`):**
- `user-select: none` — impide seleccionar texto con el mouse
- `contextmenu` bloqueado — sin clic derecho
- Atajos bloqueados vía `keydown`: `Ctrl+C/A/P/U/S`, `Ctrl+Shift+I/J/C`, `F12`, `PrintScreen`
- `window.blur` + `visibilitychange` unificados → blur CSS inmediato (`filter: blur(24px)`) sobre el contenido + overlay negro al perder el foco de ventana (captura `Win+Shift+S`, `Alt+Tab`, Snipping Tool)
- `@media print { display: none }` — página en blanco al imprimir

**Informe PDF:**
- Marca de agua diagonal personalizada en cada página con nombre + tipo + número de documento del aprendiz
- Metadatos del PDF (título, asunto, autor) con datos del aprendiz — persisten aunque se recorte la marca de agua
- `setEncryption()` con contraseña de apertura = cédula del aprendiz y sin permisos de copia ni impresión (lectores que respetan el estándar PDF)

### Crédito Parcial en Selección Múltiple y Emparejamiento

Fórmula leniente (sin penalización por respuestas incorrectas):

- **Selección múltiple**: `crédito = opciones_correctas_seleccionadas / total_opciones_correctas`
- **Emparejamiento**: `crédito = pares_correctos / total_pares`
- **Selección única**: sigue siendo todo-o-nada (solo hay una respuesta correcta)

El `puntajeTotal` se calcula como `(suma_de_créditos / total_preguntas) × 100`. En los resultados y el PDF, las preguntas con crédito parcial (0 < crédito < 1) se muestran como **"Parcial"** en ámbar con el detalle (e.g., "3 de 4 opciones correctas").

### Resend — configuración por instructor

Cada instructor gestiona su propio correo desde **Panel → Mi Perfil**:

1. Crear cuenta gratuita en [resend.com](https://resend.com) (3 000 correos/mes gratis)
2. Ir a **API Keys** y generar una nueva clave
3. En la app: `/instructor/perfil` → pegar la API key → activar el toggle

El `from` siempre es `onboarding@resend.dev` (no requiere verificar dominio).
Los correos llegan al email institucional del instructor dueño de cada evaluación.

---

## Vercel — Variables de Entorno en Producción

En **Vercel Dashboard → Settings → Environment Variables** agregar:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL directa de Neon |
| `NEXTAUTH_SECRET` | Secret generado (diferente al de desarrollo) |
| `NEXTAUTH_URL` | `https://tu-dominio.vercel.app` |
| `NEXT_PUBLIC_USE_DB_BACKEND` | `true` |

> `RESEND_API_KEY`, `NEXT_PUBLIC_INSTRUCTOR_EMAIL` y `NEXT_PUBLIC_SENDER_EMAIL` ya **no son necesarias** — las API keys de Resend se almacenan por instructor en la base de datos.
