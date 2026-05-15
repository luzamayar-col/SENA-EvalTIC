# SENA EvalTIC

![SENA](https://img.shields.io/badge/SENA-CEET-39A900?style=flat-square) ![Version](https://img.shields.io/badge/version-1.1.0-blue?style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=flat-square&logo=tailwindcss) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma) ![PostgreSQL](https://img.shields.io/badge/Neon-Postgres-4169E1?style=flat-square&logo=postgresql) ![NextAuth](https://img.shields.io/badge/NextAuth-v4-FFCF00?style=flat-square&logo=next.js)

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
| **Notificaciones por correo** | Convocatoria a aprendices por ficha o por evaluación completa (con mensaje personalizado); resultado automático al instructor y al aprendiz al finalizar; vista previa del correo al instructor en modo prueba |
| **Interfaz Móvil**          | Diseño responsive con modales optimizados para pantallas pequeñas                                                           |
| **Panel del instructor**    | Dashboard con métricas, gestión completa de evaluaciones, fichas, aprendices, resultados y exportación Excel                |
| **Modo prueba**             | El instructor puede presentar la evaluación en modo prueba — los resultados no se guardan                                   |
| **Editor de preguntas**     | Interfaz visual drag-and-drop para editar, reordenar y crear preguntas del banco                                            |
| **Importación SOFIA Plus**  | Importar aprendices desde el Excel de SOFIA Plus (detección automática de columnas)                                         |
| **Exportación Excel**       | Resultados exportables en `.xlsx` con dos hojas (Resultados y Resumen)                                                      |
| **Antiplagio**              | Marca de agua en pantalla y PDF; blur overlay + contador de incidencias persistido en BD; alertas Bajo/Medio/Alto con umbrales dinámicos (configurables por evaluación); **anulación automática** con calificación 0 al superar el umbral alto (configurable, default 3 incidencias); Fullscreen API con restauración automática al volver; bloqueo de copy/cut/print/DevTools; tarjeta de integridad en resultados |
| **Contraseñas seguras**     | Formulario de instructores con medidor de fortaleza en tiempo real, toggle de visibilidad, confirmación de contraseña y validación de complejidad (mayúsculas, números, caracteres especiales) |
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
│   │       ├── instructores/ # Gestión de instructores (solo admin)
│       └── configuracion/ # Configuración global del sistema (solo admin)
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
│           │   └── [id]/
│           │       ├── prueba/        # POST: inicia modo prueba (sin guardar resultado)
│           │       ├── notificar/     # POST: correo de convocatoria al instructor (vista previa)
│           │       ├── preguntas/     # GET: descarga banco de preguntas en formato JSON
│           │       └── competencias/  # GET: competencias y RAs usados anteriormente
│           ├── fichas/
│           │   └── [id]/
│           │       ├── aprendices/    # GET list + POST single/bulk import
│           │       ├── notificar/     # POST: convocatoria a los aprendices de la ficha
│           │       └── stats/         # Métricas de la ficha
│           ├── aprendices/
│           │   └── [id]/
│           │       ├── route.ts       # PUT editar, DELETE eliminar
│           │       └── intentos/      # PATCH conceder intentos extra
│           ├── resultados/
│           │   ├── export/            # CSV
│           │   └── export-excel/      # XLSX (dos hojas: Resultados + Resumen)
│           ├── templates/[type]/      # GET plantillas descargables (aprendices.xlsx, preguntas.json)
│           └── admin/config/         # GET+PUT configuración global (senderEmail) — solo admin
├── components/
│   ├── organisms/            # Header, tablas CRUD, PreguntasEditor, FichaDetailClient
│   ├── molecules/            # Diálogos, badges, filtros, ExcelUploader, JsonUploader
│   ├── templates/            # FormularioRegistro (2 pasos), EvaluacionFormTemplate
│   └── providers/            # SessionProvider
├── lib/
│   ├── prisma.ts             # Singleton PrismaClient con PrismaNeonHttp
│   ├── auth.ts               # authOptions (NextAuth, maxAge 8h, cookies seguras)
│   ├── auth-utils.ts         # requireInstructor() — guard server-side
│   ├── crypto.ts             # AES-256-GCM: encryptValue/safeDecrypt para API keys
│   ├── email.ts              # enviarCorreoResultado() — función interna (no endpoint público)
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
Ficha           → tiene Aprendiz[], Resultado[]  (cascade delete: eliminar ficha borra aprendices y resultados)
Aprendiz        → cédula + intentosExtra por ficha
Resultado       → intento (1,2,3...) + esPrueba (true/false)
AppConfig       → clave/valor para configuración global (ej: senderEmail)
```

- **Aprendiz**: los aprendices deben estar pre-cargados en la ficha antes de poder presentar la evaluación.
- **Resultado.intento**: permite múltiples intentos (`@@unique([cedula, evaluacionId, intento])`).
- **Resultado.esPrueba**: si `true`, el resultado no se registró desde el flujo de aprendiz.

---

## Configuración y Despliegue

### 0. Setup Wizard (recomendado)

Para una configuración guiada completa, ejecute el wizard incluido en el repositorio:

```powershell
# En PowerShell, desde la raíz del proyecto
.\setup-wizard.ps1
```

El wizard guía cada variable de entorno paso a paso, genera los secrets automáticamente, aplica el schema en Neon y crea el instructor admin. Si prefiere configurar todo manualmente, siga los pasos 1–6.

---

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

# Datos del instructor admin inicial (seed)
INSTRUCTOR_SEED_EMAIL=admin@tu-organizacion.edu.co
INSTRUCTOR_SEED_NOMBRE=Administrador EvalTIC
INSTRUCTOR_SEED_PASSWORD=tu-contraseña-segura   # 8+ chars, mayúscula, número, símbolo

# Feature flag: "true" activa el backend Neon; "false" usa el flujo JSON legacy
NEXT_PUBLIC_USE_DB_BACKEND="true"

# Cifrado AES-256-GCM para las API keys de Resend almacenadas en BD
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<64-hex-chars>

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
- Email: valor de `INSTRUCTOR_SEED_EMAIL` en `.env.local`
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
- **Métricas globales**: total presentaciones / total aprendices, tasa de aprobación, promedio global, evaluaciones activas
- **Cards por evaluación**: grid con presentaciones, tasa de aprobación y promedio propios de cada evaluación, con indicador de color (verde ≥65 %, ámbar ≥40 %, rojo <40 %) y badge Activa/Inactiva

### Evaluaciones
- Crear/editar evaluaciones con banco de preguntas (subir `.json` o usar el editor visual)
- Configurar: tiempo límite, % para aprobar, **máx. intentos**, distribución de tipos de pregunta, **umbrales de alerta antiplagio** (Bajo / Medio / Alto — por defecto medio = 2, alto = 3)
- **Selectores de competencia y RA**: desplegables con competencias y resultados de aprendizaje usados anteriormente — al seleccionar uno rellena automáticamente código y nombre
- **Editor de preguntas** (`/instructor/evaluaciones/[id]/preguntas`): drag-reorder, crear/editar/eliminar preguntas de los 3 tipos
- **Descargar banco de preguntas**: botón en la sección "Banco de preguntas" al editar y en el editor de preguntas — descarga el banco actual en formato JSON reutilizable
- **Enviar correo de convocatoria** (botón 🔔 en tabla de evaluaciones): envía el correo de convocatoria **al instructor** para verificar cómo se ve; campo de mensaje personalizado opcional
- **Modo prueba** (botón ⚗): el instructor presenta la evaluación sin guardar resultado; muestra banner ámbar; envía al instructor una vista previa del correo de resultado (independientemente del flag de notificaciones)
- Activar/desactivar + fechas de vigencia por evaluación

### Fichas
- CRUD completo (crear, editar, eliminar)
- Número de ficha con link al **detalle de ficha** (`/instructor/fichas/[id]`)
- Activar/desactivar por ficha independientemente de la evaluación

### Detalle de Ficha (`/instructor/fichas/[id]`)
- **4 métricas**: total aprendices, presentaciones, tasa aprobación, promedio puntaje
- **Tab Aprendices**: tabla con cédula, nombre, intentos (X/Y), último resultado e **integridad** (badge Normal/Bajo/Medio/Alto según umbrales configurados)
  - Agregar aprendiz individual
  - Importar desde Excel SOFIA Plus (detección automática de columnas)
  - Descargar plantilla `.xlsx`
  - Conceder intentos extra (+1) por aprendiz
  - Editar/eliminar aprendices
  - Descargar informe PDF del último intento por aprendiz (ícono ↓)
  - **Notificar aprendices** (botón 🔔): envía convocatoria solo a los aprendices de esa ficha con mensaje personalizado opcional; el instructor recibe copia del resumen
- **Tab Resultados**: tabla de presentaciones + columna de integridad antiplagio + exportar Excel

### Resultados
- Tabla paginada con filtros por evaluación, ficha y resultado
- **Exportar Excel** (`.xlsx`, dos hojas: Resultados y Resumen)
- Exportar CSV (legacy)

### Instructores _(solo admin)_
- Listar (paginado, 20 por página), crear, editar y eliminar instructores
- Cada instructor gestiona sus propias evaluaciones

### Configuración del sistema _(solo admin)_
- Editar el correo remitente (`from`) de los emails de resultados
- Almacenado en `AppConfig` DB — editable sin redespliegue

---

## Flujo del Aprendiz

1. Va a la raíz `/`
2. Selecciona ficha en el dropdown (solo fichas activas con evaluación dentro de vigencia)
3. Ingresa su número de cédula → sistema valida contra el roster
4. Ve pantalla de confirmación con nombre, ficha, competencia, RA e intentos restantes
5. Ingresa (o confirma) su correo
6. Inicia evaluación → responde preguntas → finaliza
7. Ve resultados con PDF descargable, tarjeta de **integridad de sesión** (incidencias antiplagio); el instructor recibe el resultado por correo y el aprendiz recibe una copia en su correo personal (si tiene uno registrado)

**Si el aprendiz ya agotó sus intentos:**
En el paso 4 se muestra el mensaje de intentos agotados y, si existe un resultado previo, aparece el botón **"Descargar mi informe (último intento)"** que genera el PDF directamente en el cliente sin necesidad de cuenta. La seguridad se garantiza verificando que la cédula ingresada coincida con la del resultado en la BD.

---

## Roles y Seguridad

| Rol | Acceso |
|---|---|
| **Admin** | Todas las secciones + gestión de instructores |
| **Instructor** | Dashboard, sus evaluaciones, fichas, aprendices, resultados |
| **Aprendiz** | Flujo público: validar cédula → evaluación → resultados |

### Medidas de seguridad implementadas

- **Proxy centralizado** (`src/proxy.ts`): protege las rutas `/instructor/*` a nivel de enrutamiento con JWT (Next.js 16 usa `proxy.ts` en lugar de `middleware.ts`)
- **API routes** `/api/instructor/**`: verifican sesión con `requireInstructor()` (doble protección)
- **Contraseñas**: hasheadas con bcryptjs (cost 12); requisitos: 8+ chars, mayúscula, número y carácter especial
- **JWT sessions**: expiración de 8 horas (jornada laboral); cookies `httpOnly`, `sameSite: lax`, `secure` en producción
- **Horizontal privilege escalation**: todas las queries filtran por `instructorId` — un instructor no puede acceder a recursos de otro
- **RBAC**: flag `isAdmin` verificado en todas las rutas admin
- **Headers HTTP**: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` configurados en `next.config.ts`
- **Correo server-side**: el envío de correos al instructor ocurre dentro de `/api/evaluacion/finalizar` — no hay endpoint público de email abusable
- **Cifrado de API keys**: las API keys de Resend se cifran con AES-256-GCM (requiere `ENCRYPTION_KEY`) antes de guardarse en BD
- **Modo prueba**: requiere token JWT de instructor para finalizar (no puede ser falsificado)
- **Límites de upload**: JSON ≤ 5 MB, Excel ≤ 10 MB; validación de extensión y tipo MIME

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
- Atajos bloqueados vía `keydown`: `Ctrl+C/A/P/U/S`, `Ctrl+Shift+I/J/C`, `F12`
- Eventos `copy` y `cut` bloqueados directamente (cubre extensiones de navegador y menús del sistema, no solo Ctrl+C)
- `PrintScreen` detectado: activa el blur overlay inmediatamente (el OS toma el screenshot antes del evento, pero reintentos solo capturan la pantalla negra)
- **Fullscreen API**: se solicita pantalla completa al iniciar; salir de fullscreen (Win+D, F11, etc.) activa el overlay; al hacer clic en "Volver a la evaluación" se **restaura el fullscreen** automáticamente
- `window.blur` + `visibilitychange` + `fullscreenchange` → blur CSS inmediato (`filter: blur(24px)`) + overlay negro `bg-black/95` al cambiar de contexto. Los tres eventos se desduplicam con un `ref` guard, contando **solo 1 incidencia** por cambio de pestaña/contexto (sin triple conteo)
- **Contador de incidencias** visible en el overlay con colores dinámicos basados en `umbralMedio`/`umbralAlto` de la evaluación; al finalizar se persiste en `Resultado.incidenciasAntiplagio`. El instructor ve el nivel en la tabla de aprendices y en el informe PDF
- **Tarjeta de integridad en resultados**: en `/resultados` se muestra una tarjeta con el conteo de incidencias y su severidad (verde / ámbar / rojo) usando los mismos umbrales dinámicos de la evaluación
- `@media print { display: none }` — página en blanco al imprimir
- **Marca de agua en pantalla**: nombre y documento del aprendiz como texto diagonal semitransparente sobre toda la evaluación — hace trazable cualquier captura incluyendo `Win+Shift+S` y botones físicos de móvil (que el navegador no puede interceptar)

> **Limitación técnica**: Las capturas con `Win+Shift+S` (overlay OS sin quitar foco al navegador) y los botones físicos de móvil (iOS/Android) no pueden bloquearse a nivel de navegador. La marca de agua en pantalla es la defensa efectiva para esos casos.

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

Los correos llegan al email institucional del instructor dueño de cada evaluación.

### Correo remitente (`from`) — configurable por el admin

El campo `from` de todos los correos se almacena en la tabla `AppConfig` con la clave `senderEmail`.
El valor por defecto es `EvalTIC SENA <onboarding@resend.dev>` (plan gratuito de Resend, sin verificación de dominio).

El admin puede cambiarlo desde **Panel → Administración → Configuración del sistema** (`/instructor/configuracion`).
Si en el futuro se verifica un dominio propio en Resend, solo hay que actualizar ese campo desde la UI.

---

## Vercel — Variables de Entorno en Producción

En **Vercel Dashboard → Settings → Environment Variables** agregar:

### Obligatorias

| Variable | Valor | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | Connection string de Neon (pooler) | Neon console → Connect → Pooled connection |
| `NEXTAUTH_SECRET` | 32 bytes en hex | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXTAUTH_URL` | `https://tu-dominio.vercel.app` | URL pública del deploy |
| `NEXT_PUBLIC_USE_DB_BACKEND` | `true` | Activa el backend Neon |

### Para el seed inicial (primer despliegue)

Solo se necesitan al correr `npx prisma db seed`. Pueden eliminarse después.

| Variable | Descripción | Default si se omite |
|---|---|---|
| `INSTRUCTOR_SEED_EMAIL` | Email del instructor admin | — (falla el seed) |
| `INSTRUCTOR_SEED_PASSWORD` | Contraseña del instructor admin (8+ chars, mayúscula, número, símbolo) | — (falla el seed) |
| `INSTRUCTOR_SEED_NOMBRE` | Nombre del instructor admin | `Administrador EvalTIC` |

### Opcionales pero recomendadas

| Variable | Descripción | Default si se omite |
|---|---|---|
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) para cifrar API keys de Resend en la DB | Sin cifrado — las keys se guardan en texto plano |

Generar `ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Las API keys de Resend **no son variables de entorno globales** — cada instructor las configura desde su perfil (`/instructor/perfil`). El `ENCRYPTION_KEY` solo cifra esas keys antes de guardarlas en la BD.
