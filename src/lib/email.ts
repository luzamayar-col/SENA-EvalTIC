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
  tiempoUsado: number;
  resultado: {
    puntajeTotal: number;
    preguntasCorrectas: number;
    totalPreguntas: number;
    aprobado: boolean;
  };
}

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
    tiempoUsado,
    resultado,
  } = params;

  try {
    // Obtener config del instructor y ficha en una sola consulta
    const [evaluacion, ficha] = await Promise.all([
      prisma.evaluacion.findUnique({
        where: { id: evaluacionId },
        select: {
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

    const { puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado } =
      resultado;

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    const estadoTexto = aprobado ? "APROBADO" : "NO APROBADO";
    const colorEstado = aprobado ? "#39A900" : "#EF4444";

    const htmlContent = `
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
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Ficha:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${ficha?.numero ?? fichaId}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Programa:</strong></td><td style="padding: 8px 0;">${ficha?.programa ?? ""}</td></tr>
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

    const senderConfig = await prisma.appConfig.findUnique({
      where: { clave: "senderEmail" },
    });
    const senderEmail =
      senderConfig?.valor ?? "EvalTIC SENA <onboarding@resend.dev>";

    // Descifrar la API key (compatible con claves cifradas y en texto plano)
    const apiKey = safeDecrypt(evaluacion.instructor.resendApiKey);
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: senderEmail,
      to: [evaluacion.instructor.email],
      subject: `Resultados Evaluación - ${nombres} ${apellidos} - Ficha ${ficha?.numero ?? fichaId}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, reason: "resend_error" };
    }

    return { success: true };
  } catch (err) {
    console.error("enviarCorreoResultado error:", err);
    return { success: false, reason: "internal_error" };
  }
}
