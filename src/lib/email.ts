/**
 * Lógica de envío de correo de resultados — función interna del servidor.
 * No exponer como endpoint público; llamar desde API routes autenticadas.
 */
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { safeDecrypt } from "@/lib/crypto";

interface EnviarCorreoResultadoParams {
  evaluacionId: string;
  fichaId: string;
  cedula: string;
  tipoDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  emailAprendiz?: string | null;
  tiempoUsado: number;
  intento?: number;
  maxIntentos?: number;
  incidenciasAntiplagio?: number;
  resultado: {
    puntajeTotal: number;
    preguntasCorrectas: number;
    totalPreguntas: number;
    aprobado: boolean;
  };
  umbralAntiplagio?: { medio: number; alto: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function nivelAntiplagio(
  incidencias: number,
  umbral: { medio: number; alto: number },
): { label: string; color: string } {
  if (incidencias === 0) return { label: "Normal", color: "#16a34a" };
  if (incidencias < umbral.medio) return { label: "Bajo", color: "#d97706" };
  if (incidencias < umbral.alto) return { label: "Medio", color: "#ea580c" };
  return { label: "Alto", color: "#dc2626" };
}

// ── Template email al instructor ──────────────────────────────────────────────

function buildHtmlInstructor(params: {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  cedula: string;
  email: string;
  fichaNumero: string;
  fichaPrograma: string;
  puntajeTotal: number;
  preguntasCorrectas: number;
  totalPreguntas: number;
  aprobado: boolean;
  tiempoUsado: number;
}): string {
  const { nombres, apellidos, tipoDocumento, cedula, email, fichaNumero, fichaPrograma,
    puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado, tiempoUsado } = params;
  const estadoTexto = aprobado ? "APROBADO" : "NO APROBADO";
  const colorEstado = aprobado ? "#39A900" : "#EF4444";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #00324D; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Resultados de Evaluación</h1>
        <p style="color: #ffffff; margin: 5px 0 0 0; opacity: 0.8;">EvalTIC SENA</p>
      </div>
      <div style="padding: 20px; background-color: #fafafa;">
        <h2 style="color: #00324D; border-bottom: 2px solid #39A900; padding-bottom: 5px;">Datos del Aprendiz</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Nombre:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${nombres} ${apellidos}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Documento:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${tipoDocumento} ${cedula}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Correo:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${email}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Ficha:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${fichaNumero}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Programa:</strong></td><td style="padding: 8px 0;">${fichaPrograma}</td></tr>
          </tbody>
        </table>
        <h2 style="color: #00324D; border-bottom: 2px solid #39A900; padding-bottom: 5px; margin-top: 30px;">Resultados</h2>
        <div style="text-align: center; margin: 20px 0; padding: 20px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="font-size: 48px; font-weight: bold; color: ${colorEstado};">${puntajeTotal}%</div>
          <div style="font-size: 18px; font-weight: bold; color: ${colorEstado}; margin-top: 5px;">${estadoTexto}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Aciertos:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${preguntasCorrectas} de ${totalPreguntas}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Tiempo Utilizado:</strong></td><td style="padding: 8px 0;">${formatTime(tiempoUsado)}</td></tr>
          </tbody>
        </table>
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          Este es un correo automático generado por el sistema EvalTIC del SENA.
        </p>
      </div>
    </div>
  `;
}

// ── Template email al aprendiz ────────────────────────────────────────────────

function buildHtmlAprendiz(params: {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  cedula: string;
  fichaNumero: string;
  fichaPrograma: string;
  evaluacionNombre: string;
  puntajeTotal: number;
  preguntasCorrectas: number;
  totalPreguntas: number;
  aprobado: boolean;
  tiempoUsado: number;
  intento: number;
  maxIntentos: number;
  incidencias: number;
  umbral: { medio: number; alto: number };
  fecha: string;
}): string {
  const { nombres, apellidos, tipoDocumento, cedula, fichaNumero, fichaPrograma,
    evaluacionNombre, puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado,
    tiempoUsado, intento, maxIntentos, incidencias, umbral, fecha } = params;
  const estadoTexto = aprobado ? "APROBADO ✓" : "NO APROBADO";
  const colorEstado = aprobado ? "#39A900" : "#EF4444";
  const nivel = nivelAntiplagio(incidencias, umbral);
  const intentosRestantes = maxIntentos - intento;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #00324D; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Tu resultado de evaluación</h1>
        <p style="color: #ffffff; margin: 5px 0 0 0; opacity: 0.8;">EvalTIC SENA</p>
      </div>
      <div style="padding: 24px; background-color: #fafafa;">
        <p style="font-size: 15px; color: #374151; margin-top: 0;">
          Hola <strong>${nombres}</strong>, a continuación encontrarás el resumen de tu evaluación.
        </p>

        <div style="text-align: center; margin: 20px 0; padding: 24px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="font-size: 56px; font-weight: bold; color: ${colorEstado}; line-height: 1;">${puntajeTotal}%</div>
          <div style="font-size: 20px; font-weight: bold; color: ${colorEstado}; margin-top: 8px;">${estadoTexto}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">Intento ${intento} de ${maxIntentos}</div>
        </div>

        <h2 style="color: #00324D; border-bottom: 2px solid #39A900; padding-bottom: 5px; font-size: 15px;">Detalles</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 45%;">Evaluación</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${evaluacionNombre}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Ficha</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${fichaNumero} — ${fichaPrograma}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Documento</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${tipoDocumento} ${cedula}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Respuestas correctas</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${preguntasCorrectas} de ${totalPreguntas}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Tiempo utilizado</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${formatTime(tiempoUsado)}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Fecha</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${fecha}</td></tr>
            <tr>
              <td style="padding: 7px 0; color: #6b7280;">Integridad académica</td>
              <td style="padding: 7px 0;">
                <span style="font-weight: 600; color: ${nivel.color};">${nivel.label}</span>
                ${incidencias > 0 ? `<span style="font-size: 12px; color: #9ca3af; margin-left: 4px;">(${incidencias} incidencia${incidencias !== 1 ? "s" : ""})</span>` : ""}
              </td>
            </tr>
          </tbody>
        </table>

        ${!aprobado && intentosRestantes > 0 ? `
        <div style="margin-top: 20px; padding: 14px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 14px; color: #1d4ed8;">
          Aún te queda${intentosRestantes > 1 ? "n" : ""} <strong>${intentosRestantes} intento${intentosRestantes > 1 ? "s" : ""}</strong>. Puedes volver a presentar la evaluación cuando estés listo.
        </div>
        ` : ""}

        <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          Este es un correo automático generado por el sistema EvalTIC del SENA. No respondas a este correo.
        </p>
      </div>
    </div>
  `;
}

// ── enviarCorreoResultado ─────────────────────────────────────────────────────

export async function enviarCorreoResultado(
  params: EnviarCorreoResultadoParams,
): Promise<{ success: boolean; reason?: string }> {
  const {
    evaluacionId,
    fichaId,
    cedula,
    tipoDocumento,
    nombres,
    apellidos,
    email,
    emailAprendiz,
    tiempoUsado,
    intento = 1,
    maxIntentos = 1,
    incidenciasAntiplagio = 0,
    resultado,
    umbralAntiplagio,
  } = params;

  try {
    // Obtener config del instructor, evaluación y ficha en una sola consulta
    const [evaluacion, ficha] = await Promise.all([
      prisma.evaluacion.findUnique({
        where: { id: evaluacionId },
        select: {
          nombre: true,
          config: true,
          instructor: {
            select: {
              email: true,
              resendApiKey: true,
              emailNotificaciones: true,
            },
          },
        },
      }),
      prisma.ficha.findUnique({
        where: { id: fichaId },
        select: { numero: true, programa: true },
      }),
    ]);

    if (
      !evaluacion?.instructor.emailNotificaciones ||
      !evaluacion.instructor.resendApiKey
    ) {
      return { success: false, reason: "email_disabled" };
    }

    const { puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado } = resultado;
    const fichaNumero = ficha?.numero ?? fichaId;
    const fichaPrograma = ficha?.programa ?? "";

    const senderConfig = await prisma.appConfig.findUnique({
      where: { clave: "senderEmail" },
    });
    const senderEmail = senderConfig?.valor ?? "EvalTIC SENA <onboarding@resend.dev>";

    const apiKey = safeDecrypt(evaluacion.instructor.resendApiKey);
    const resend = new Resend(apiKey);

    const umbral = umbralAntiplagio ?? {
      medio: (evaluacion.config as any)?.umbralAntiplagio?.medio ?? 3,
      alto:  (evaluacion.config as any)?.umbralAntiplagio?.alto  ?? 5,
    };
    const fecha = new Date().toLocaleDateString("es-CO", {
      day: "2-digit", month: "long", year: "numeric",
    });

    // ── Email al instructor ──
    const htmlInstructor = buildHtmlInstructor({
      nombres, apellidos, tipoDocumento, cedula, email,
      fichaNumero, fichaPrograma,
      puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado, tiempoUsado,
    });

    const { error: errInstructor } = await resend.emails.send({
      from: senderEmail,
      to: [evaluacion.instructor.email],
      subject: `Resultados Evaluación - ${nombres} ${apellidos} - Ficha ${fichaNumero}`,
      html: htmlInstructor,
    });

    if (errInstructor) {
      console.error("Resend error (instructor):", errInstructor);
      return { success: false, reason: "resend_error" };
    }

    // ── Email al aprendiz (si tiene correo personal) ──
    const destinoAprendiz = emailAprendiz ?? null;
    if (destinoAprendiz) {
      const htmlAprendiz = buildHtmlAprendiz({
        nombres, apellidos, tipoDocumento, cedula,
        fichaNumero, fichaPrograma,
        evaluacionNombre: evaluacion.nombre,
        puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado, tiempoUsado,
        intento, maxIntentos,
        incidencias: incidenciasAntiplagio,
        umbral,
        fecha,
      });

      const { error: errAprendiz } = await resend.emails.send({
        from: senderEmail,
        to: [destinoAprendiz],
        subject: `Tu resultado — ${evaluacion.nombre} — Intento ${intento}`,
        html: htmlAprendiz,
      });

      if (errAprendiz) {
        console.warn("Resend error (aprendiz):", errAprendiz);
        // No fallar si el email al aprendiz falla; el instructor ya recibió el suyo
      }
    }

    return { success: true };
  } catch (err) {
    console.error("enviarCorreoResultado error:", err);
    return { success: false, reason: "internal_error" };
  }
}

// ── enviarCorreoPrevisualizacion ─────────────────────────────────────────────
// Envía al instructor una vista previa del correo que recibiría el aprendiz,
// usada después de completar una evaluación en modo prueba.

export async function enviarCorreoPrevisualizacion(params: {
  instructorId: string;
  evaluacionId: string;
  fichaId?: string | null;
  nombres: string;
  apellidos: string;
  tipoDocumento?: string;
  cedula: string;
  email?: string;
  puntajeTotal: number;
  preguntasCorrectas: number;
  totalPreguntas: number;
  aprobado: boolean;
  tiempoUsado: number;
  incidenciasAntiplagio?: number;
  umbralAntiplagio?: { medio: number; alto: number };
}): Promise<void> {
  try {
    const {
      instructorId, evaluacionId, fichaId,
      nombres, apellidos, tipoDocumento = "CC", cedula,
      puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado,
      tiempoUsado, incidenciasAntiplagio = 0, umbralAntiplagio,
    } = params;

    const [instructor, evaluacion, ficha] = await Promise.all([
      prisma.instructor.findUnique({
        where: { id: instructorId },
        select: { email: true, resendApiKey: true, emailNotificaciones: true },
      }),
      prisma.evaluacion.findUnique({
        where: { id: evaluacionId },
        select: { nombre: true, maxIntentos: true, config: true },
      }),
      fichaId
        ? prisma.ficha.findUnique({
            where: { id: fichaId },
            select: { numero: true, programa: true },
          })
        : Promise.resolve(null),
    ]);

    if (!instructor?.resendApiKey) return;

    const senderConfig = await prisma.appConfig.findUnique({
      where: { clave: "senderEmail" },
    });
    const senderEmail = senderConfig?.valor ?? "EvalTIC SENA <onboarding@resend.dev>";
    const apiKey = safeDecrypt(instructor.resendApiKey);
    const resend = new Resend(apiKey);

    const umbral = umbralAntiplagio ?? {
      medio: (evaluacion?.config as any)?.umbralAntiplagio?.medio ?? 3,
      alto:  (evaluacion?.config as any)?.umbralAntiplagio?.alto  ?? 5,
    };
    const fecha = new Date().toLocaleDateString("es-CO", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const htmlAprendiz = buildHtmlAprendiz({
      nombres, apellidos, tipoDocumento, cedula,
      fichaNumero: ficha?.numero ?? "—",
      fichaPrograma: ficha?.programa ?? "—",
      evaluacionNombre: evaluacion?.nombre ?? "—",
      puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado, tiempoUsado,
      intento: 1,
      maxIntentos: evaluacion?.maxIntentos ?? 1,
      incidencias: incidenciasAntiplagio,
      umbral,
      fecha,
    });

    const banner = `
      <div style="background-color:#fef3c7;border:2px dashed #d97706;padding:14px 18px;font-family:Arial,sans-serif;font-size:14px;color:#92400e;text-align:center;">
        <strong>⚗ MODO PRUEBA — Vista previa del correo al aprendiz</strong><br/>
        Esta es una simulación. No corresponde a un intento real registrado.
      </div>
    `;

    await resend.emails.send({
      from: senderEmail,
      to: [instructor.email],
      subject: `[Vista previa] Correo de resultados — ${evaluacion?.nombre ?? evaluacionId}`,
      html: banner + htmlAprendiz,
    });
  } catch (err) {
    console.warn("enviarCorreoPrevisualizacion error:", err);
  }
}
