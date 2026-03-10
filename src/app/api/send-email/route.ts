import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { datosAprendiz, resultado, tiempoTranscurrido, evaluacionId } = body;

    if (!datosAprendiz || !resultado) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (datosAprendiz, resultado)" },
        { status: 400 },
      );
    }

    // Look up the instructor's email config via the evaluacion
    let instructorEmail: string | null = null;
    let resendApiKey: string | null = null;

    if (evaluacionId) {
      const evaluacion = await prisma.evaluacion.findUnique({
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
      });

      if (evaluacion?.instructor.emailNotificaciones && evaluacion.instructor.resendApiKey) {
        instructorEmail = evaluacion.instructor.email;
        resendApiKey = evaluacion.instructor.resendApiKey;
      } else {
        // Notifications disabled or not configured — skip silently
        return NextResponse.json({ success: false, reason: "email_disabled" });
      }
    } else {
      // No evaluacionId provided — cannot determine instructor
      return NextResponse.json({ success: false, reason: "no_evaluacion_id" });
    }

    const {
      nombres,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      correo,
      ficha,
      programaFormacion,
    } = datosAprendiz;

    const { puntajeTotal, preguntasCorrectas, totalPreguntas, aprobado } = resultado;

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
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Documento:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${tipoDocumento} ${numeroDocumento}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Correo:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${correo}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Ficha:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${ficha}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Programa:</strong></td><td style="padding: 8px 0;">${programaFormacion}</td></tr>
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
              <tr><td style="padding: 8px 0;"><strong>Tiempo Utilizado:</strong></td><td style="padding: 8px 0;">${formatTime(tiempoTranscurrido)}</td></tr>
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

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [instructorEmail],
      subject: `Resultados Evaluación - ${nombres} ${apellidos} - Ficha ${ficha}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("API send-email error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
