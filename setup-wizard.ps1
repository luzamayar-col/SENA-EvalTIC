# ============================================================
#  SENA EvalTIC — Setup Wizard
#  Guía paso a paso para configurar el proyecto en Vercel
# ============================================================

param(
    [switch]$SoloVercel   # Si se pasa, omite la creación del .env.local local
)

$ErrorActionPreference = "Stop"

# ── Colores ──────────────────────────────────────────────────
function Write-Title    { param($t) Write-Host "`n$t" -ForegroundColor Cyan }
function Write-Step     { param($n,$t) Write-Host "`n  [$n] $t" -ForegroundColor Yellow }
function Write-Ok       { param($t) Write-Host "  ✓ $t" -ForegroundColor Green }
function Write-Info     { param($t) Write-Host "  → $t" -ForegroundColor White }
function Write-Warn     { param($t) Write-Host "  ⚠ $t" -ForegroundColor DarkYellow }
function Write-Err      { param($t) Write-Host "  ✗ $t" -ForegroundColor Red }
function Write-Divider  { Write-Host ("─" * 60) -ForegroundColor DarkGray }

# ── Helpers ──────────────────────────────────────────────────
function Read-NonEmpty {
    param($prompt, $default = "")
    do {
        if ($default) {
            $val = Read-Host "  $prompt [$default]"
            if (-not $val) { $val = $default }
        } else {
            $val = Read-Host "  $prompt"
        }
        if (-not $val.Trim()) { Write-Warn "Este campo no puede estar vacío." }
    } while (-not $val.Trim())
    return $val.Trim()
}

function Read-Password {
    param($prompt)
    do {
        $secure = Read-Host "  $prompt" -AsSecureString
        $plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        if (-not $plain.Trim()) { Write-Warn "La contraseña no puede estar vacía." }
    } while (-not $plain.Trim())
    return $plain
}

function Test-PasswordStrength {
    param($p)
    $errors = @()
    if ($p.Length -lt 8)               { $errors += "mínimo 8 caracteres" }
    if ($p -notmatch '[A-Z]')          { $errors += "al menos una mayúscula" }
    if ($p -notmatch '[0-9]')          { $errors += "al menos un número" }
    if ($p -notmatch '[^A-Za-z0-9]')   { $errors += "al menos un carácter especial (!@#$%...)" }
    return $errors
}

function Test-EmailFormat {
    param($e)
    return $e -match '^[^@\s]+@[^@\s]+\.[^@\s]+$'
}

function Test-DatabaseUrl {
    param($u)
    return $u -match '^postgresql://' -or $u -match '^postgres://'
}

function New-NodeSecret {
    param($bytes = 32)
    return node -e "console.log(require('crypto').randomBytes($bytes).toString('hex'))"
}

function Write-EnvLine {
    param($key, $val, $comment = "")
    if ($comment) { return "# $comment`n$key=$val" }
    return "$key=$val"
}

# ── Bienvenida ───────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║        SENA EvalTIC — Setup Wizard           ║" -ForegroundColor Cyan
Write-Host "  ║  Configuración para despliegue en Vercel     ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Info "Este wizard te guía para:"
Write-Info "  1. Crear el archivo .env.local (desarrollo local)"
Write-Info "  2. Ejecutar la migración de base de datos"
Write-Info "  3. Listar las variables que debés configurar en Vercel"
Write-Host ""
Write-Warn "Antes de empezar, necesitás tener listo:"
Write-Info "  • Una base de datos creada en https://neon.tech"
Write-Info "  • El proyecto desplegado o el dominio en Vercel"
Write-Host ""
Read-Host "  Presioná Enter para comenzar"

# ── Verificar Node.js ─────────────────────────────────────────
Write-Divider
Write-Title "Verificando prerequisitos..."
try {
    $nodeVer = node --version
    Write-Ok "Node.js $nodeVer encontrado"
} catch {
    Write-Err "Node.js no está instalado o no está en el PATH."
    Write-Info "Descargalo desde https://nodejs.org"
    exit 1
}

# ═══════════════════════════════════════════════════════════
# PASO 1 — DATABASE_URL
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Step "1/6" "Base de datos (Neon Postgres)"
Write-Host ""
Write-Info "Cómo obtener la URL de conexión:"
Write-Info "  1. Ingresá a https://console.neon.tech"
Write-Info "  2. Seleccioná tu proyecto (o creá uno nuevo con 'New Project')"
Write-Info "  3. Ir a 'Connect' → 'Connection string'"
Write-Info "  4. Elegir modo: Pooled connection (recomendado para Vercel)"
Write-Info "  5. Copiá la cadena que empieza con postgresql://"
Write-Host ""

$dbUrl = ""
do {
    $dbUrl = Read-NonEmpty "DATABASE_URL"
    if (-not (Test-DatabaseUrl $dbUrl)) {
        Write-Warn "La URL debe empezar con postgresql:// o postgres://"
        $dbUrl = ""
    }
} while (-not $dbUrl)
Write-Ok "DATABASE_URL configurada"

# ═══════════════════════════════════════════════════════════
# PASO 2 — URL de la aplicación
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Step "2/6" "URL de la aplicación"
Write-Host ""
Write-Info "Para desarrollo local: http://localhost:3000"
Write-Info "Para producción en Vercel: https://tu-proyecto.vercel.app"
Write-Info "(podés cambiarlo después en las variables de entorno de Vercel)"
Write-Host ""

$nextauthUrl = Read-NonEmpty "NEXTAUTH_URL (URL de la app)" "http://localhost:3000"
Write-Ok "NEXTAUTH_URL = $nextauthUrl"

# ═══════════════════════════════════════════════════════════
# PASO 3 — Instructor administrador
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Step "3/6" "Instructor administrador (cuenta inicial)"
Write-Host ""
Write-Info "Estos datos crean el primer instructor con rol de admin"
Write-Info "al ejecutar el seed de la base de datos."
Write-Host ""

# Email
$seedEmail = ""
do {
    $seedEmail = Read-NonEmpty "Email del instructor admin"
    if (-not (Test-EmailFormat $seedEmail)) {
        Write-Warn "Formato de email inválido. Ejemplo: admin@sena.edu.co"
        $seedEmail = ""
    }
} while (-not $seedEmail)
Write-Ok "Email: $seedEmail"

# Nombre
Write-Host ""
$seedNombre = Read-NonEmpty "Nombre del instructor admin" "Administrador EvalTIC"
Write-Ok "Nombre: $seedNombre"

# Contraseña
Write-Host ""
Write-Info "Requisitos de contraseña:"
Write-Info "  • Mínimo 8 caracteres"
Write-Info "  • Al menos una mayúscula"
Write-Info "  • Al menos un número"
Write-Info "  • Al menos un carácter especial (!@#$%...)"
Write-Host ""

$seedPassword = ""
do {
    $seedPassword = Read-Password "Contraseña del instructor admin"
    $pwErrors = Test-PasswordStrength $seedPassword
    if ($pwErrors.Count -gt 0) {
        Write-Warn "La contraseña no cumple los requisitos:"
        foreach ($e in $pwErrors) { Write-Warn "  • $e" }
        $seedPassword = ""
    } else {
        $confirm = Read-Password "Confirmá la contraseña"
        if ($seedPassword -ne $confirm) {
            Write-Warn "Las contraseñas no coinciden."
            $seedPassword = ""
        }
    }
} while (-not $seedPassword)
Write-Ok "Contraseña configurada correctamente"

# ═══════════════════════════════════════════════════════════
# PASO 4 — Feature flag
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Step "4/6" "Modo de backend"
Write-Host ""
Write-Info "NEXT_PUBLIC_USE_DB_BACKEND activa el backend de Neon Postgres."
Write-Info "Sin esta variable, la app usa el flujo legacy de archivos JSON."
Write-Info "Para Vercel siempre debe ser 'true'."
Write-Host ""
Write-Ok "NEXT_PUBLIC_USE_DB_BACKEND=true (fijado automáticamente)"
$useDb = "true"

# ═══════════════════════════════════════════════════════════
# PASO 5 — Secrets automáticos
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Step "5/6" "Generando secrets de seguridad"
Write-Host ""
Write-Info "Generando NEXTAUTH_SECRET (32 bytes aleatorios)..."
$nextauthSecret = New-NodeSecret 32
Write-Ok "NEXTAUTH_SECRET generado"

Write-Info "Generando ENCRYPTION_KEY (32 bytes = 64 hex chars para AES-256-GCM)..."
$encryptionKey = New-NodeSecret 32
Write-Ok "ENCRYPTION_KEY generado"
Write-Host ""
Write-Warn "Guardá estas claves en un lugar seguro (gestor de contraseñas)."
Write-Warn "Si las perdés, los datos cifrados en la DB quedarán inaccesibles."

# ═══════════════════════════════════════════════════════════
# PASO 6 — Crear .env.local
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Step "6/6" "Generando .env.local"
Write-Host ""

$envContent = @"
# ============================================================
#  SENA EvalTIC — Variables de entorno locales
#  Generado por setup-wizard.ps1 — NO commitear este archivo
# ============================================================

# Base de datos (Neon Postgres — pooler URL recomendada para Vercel)
DATABASE_URL=$dbUrl

# NextAuth — autenticación
NEXTAUTH_SECRET=$nextauthSecret
NEXTAUTH_URL=$nextauthUrl

# Feature flag: activa el backend Neon (true = DB, false = JSON legacy)
NEXT_PUBLIC_USE_DB_BACKEND=$useDb

# Cifrado AES-256-GCM para API keys de Resend almacenadas en la BD
# ⚠ Guardar este valor en un lugar seguro — sin él los datos cifrados son inaccesibles
ENCRYPTION_KEY=$encryptionKey

# Datos del instructor admin inicial (solo necesarios para el seed)
# Pueden eliminarse después de ejecutar: npx prisma db seed
INSTRUCTOR_SEED_EMAIL=$seedEmail
INSTRUCTOR_SEED_NOMBRE=$seedNombre
INSTRUCTOR_SEED_PASSWORD=$seedPassword
"@

$envPath = Join-Path $PSScriptRoot ".env.local"

if (Test-Path $envPath) {
    Write-Warn ".env.local ya existe."
    $overwrite = Read-Host "  ¿Sobreescribir? (s/N)"
    if ($overwrite -ne "s" -and $overwrite -ne "S") {
        Write-Info "Se omitió la escritura del .env.local."
        $envPath = $null
    }
}

if ($envPath) {
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Ok ".env.local creado en $envPath"
}

# ═══════════════════════════════════════════════════════════
# MIGRACIÓN DE BASE DE DATOS
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Title "Migración de base de datos"
Write-Host ""
Write-Info "Ahora hay que aplicar el schema en Neon y crear el instructor admin."
Write-Info "Esto ejecuta los siguientes comandos:"
Write-Info "  1. npx prisma db push    → aplica el schema en la BD"
Write-Info "  2. npx prisma generate   → genera el cliente TypeScript"
Write-Info "  3. npx prisma db seed    → crea el instructor admin inicial"
Write-Host ""
$runMigration = Read-Host "  ¿Ejecutar ahora? (S/n)"

if ($runMigration -ne "n" -and $runMigration -ne "N") {
    Write-Host ""
    Write-Info "Ejecutando prisma db push..."
    try {
        npx prisma db push
        Write-Ok "Schema aplicado en la base de datos"
    } catch {
        Write-Err "Error al ejecutar prisma db push"
        Write-Err $_.Exception.Message
        Write-Warn "Podés ejecutarlo manualmente: npx prisma db push"
    }

    Write-Host ""
    Write-Info "Ejecutando prisma generate..."
    try {
        npx prisma generate
        Write-Ok "Cliente Prisma generado"
    } catch {
        Write-Err "Error al ejecutar prisma generate"
        Write-Err $_.Exception.Message
    }

    Write-Host ""
    Write-Info "Ejecutando prisma db seed (crea el instructor admin)..."
    try {
        npx prisma db seed
        Write-Ok "Seed ejecutado — instructor admin creado"
    } catch {
        Write-Err "Error al ejecutar prisma db seed"
        Write-Err $_.Exception.Message
        Write-Warn "Podés ejecutarlo manualmente: npx prisma db seed"
    }
} else {
    Write-Warn "Recordá ejecutar manualmente antes de iniciar la app:"
    Write-Info "  npx prisma db push"
    Write-Info "  npx prisma generate"
    Write-Info "  npx prisma db seed"
}

# ═══════════════════════════════════════════════════════════
# INSTRUCCIONES PARA VERCEL
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Title "Variables de entorno en Vercel"
Write-Host ""
Write-Info "En Vercel Dashboard → tu proyecto → Settings → Environment Variables"
Write-Info "agregá las siguientes variables (todas para Production + Preview):"
Write-Host ""

$vercelVars = @(
    @{ k = "DATABASE_URL";                  v = $dbUrl;            note = "(la misma URL de Neon)" },
    @{ k = "NEXTAUTH_SECRET";               v = $nextauthSecret;   note = "(el mismo que en .env.local)" },
    @{ k = "NEXTAUTH_URL";                  v = "https://tu-proyecto.vercel.app"; note = "(reemplazá con tu dominio real)" },
    @{ k = "NEXT_PUBLIC_USE_DB_BACKEND";    v = "true";            note = "" },
    @{ k = "ENCRYPTION_KEY";               v = $encryptionKey;    note = "(el mismo que en .env.local)" },
    @{ k = "INSTRUCTOR_SEED_EMAIL";         v = $seedEmail;        note = "(solo para el seed — podés eliminarlo después)" },
    @{ k = "INSTRUCTOR_SEED_NOMBRE";        v = $seedNombre;       note = "(solo para el seed — podés eliminarlo después)" },
    @{ k = "INSTRUCTOR_SEED_PASSWORD";      v = "***";             note = "(tu contraseña — no se muestra por seguridad)" }
)

foreach ($var in $vercelVars) {
    Write-Host ""
    Write-Host "  $($var.k)" -ForegroundColor Yellow -NoNewline
    if ($var.note) {
        Write-Host "  $($var.note)" -ForegroundColor DarkGray
    } else {
        Write-Host ""
    }
    if ($var.k -ne "INSTRUCTOR_SEED_PASSWORD" -and $var.k -ne "NEXTAUTH_URL") {
        Write-Host "  $($var.v)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Warn "NEXTAUTH_URL en Vercel debe ser tu dominio real (no localhost)."
Write-Warn "Después del primer deploy, el seed ya no es necesario."
Write-Warn "Podés eliminar las variables INSTRUCTOR_SEED_* de Vercel."

# ═══════════════════════════════════════════════════════════
# RESEND — configuración por instructor
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Title "Configurar Resend (notificaciones por email)"
Write-Host ""
Write-Info "Las notificaciones de resultados usan Resend."
Write-Info "Cada instructor configura su propia API key desde el panel:"
Write-Host ""
Write-Info "  1. Creá una cuenta gratuita en https://resend.com (3000 mails/mes)"
Write-Info "  2. Generá una API key en Resend → API Keys"
Write-Info "  3. En la app: /instructor/perfil → pegá la API key → activá el toggle"
Write-Host ""
Write-Info "No se necesita ninguna variable de entorno global para Resend."
Write-Info "Las API keys se cifran con ENCRYPTION_KEY antes de guardarse en la BD."

# ═══════════════════════════════════════════════════════════
# RESUMEN FINAL
# ═══════════════════════════════════════════════════════════
Write-Divider
Write-Title "¡Listo! Resumen"
Write-Host ""
Write-Ok ".env.local creado con todas las variables"
Write-Ok "Base de datos migrada y seed ejecutado"
Write-Ok "Variables listadas para configurar en Vercel"
Write-Host ""
Write-Info "Próximos pasos:"
Write-Info "  1. Configurar las variables de entorno en Vercel (listadas arriba)"
Write-Info "  2. Hacer push del código al repositorio"
Write-Info "  3. Vercel despliega automáticamente al detectar el push"
Write-Info "  4. Acceder al panel: https://tu-dominio.vercel.app/instructor/login"
Write-Info "     Email: $seedEmail"
Write-Info "     Contraseña: la que ingresaste en el wizard"
Write-Host ""
Write-Host "  Documentación completa en README.md" -ForegroundColor DarkGray
Write-Divider
Write-Host ""
