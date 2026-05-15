import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Resend } from "resend";
import { safeDecrypt } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  mensaje: z.string().max(2000).optional(),
});

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFechaEsCO(date: Date | null | undefined): string {
  if (!date) return "—";
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

function buildHtmlNotificacion(params: {
  nombres: string;
  evaluacionNombre: string;
  fichaNumero: string;
  fichaPrograma: string;
  fechaInicio: string;
  fechaFin: string;
  maxIntentos: number;
  mensaje?: string;
}): string {
  const { nombres, evaluacionNombre, fichaNumero, fichaPrograma,
    fechaInicio, fechaFin, maxIntentos, mensaje } = params;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #00324D; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Convocatoria de Evaluación</h1>
        <p style="color: #ffffff; margin: 5px 0 0 0; opacity: 0.8;">EvalTIC SENA</p>
      </div>
      <div style="padding: 24px; background-color: #fafafa;">
        <p style="font-size: 15px; color: #374151; margin-top: 0;">
          Hola <strong>${nombres}</strong>, tienes una evaluación disponible en el sistema EvalTIC del SENA.
        </p>

        <h2 style="color: #00324D; border-bottom: 2px solid #39A900; padding-bottom: 5px; font-size: 15px;">Información de la evaluación</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 45%;">Evaluación</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${evaluacionNombre}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Ficha</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${fichaNumero} — ${fichaPrograma}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Disponible desde</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${fechaInicio}</td></tr>
            <tr><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Disponible hasta</td><td style="padding: 7px 0; border-bottom: 1px solid #f3f4f6;">${fechaFin}</td></tr>
            <tr><td style="padding: 7px 0; color: #6b7280;">Intentos disponibles</td><td style="padding: 7px 0;">${maxIntentos}</td></tr>
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 14px; color: #166534;">
          <strong>¿Cómo presentar la evaluación?</strong><br/>
          Ingresa a la plataforma EvalTIC con tu número de cédula cuando el período esté activo.
          Asegúrate de tener buena conexión a internet y evita cambiar de pestaña durante la prueba.
        </div>

        ${mensaje ? `
        <div style="margin-top: 16px; padding: 14px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 14px; color: #1e40af;">
          <strong>Mensaje de tu instructor:</strong><br/>
          ${mensaje}
        </div>
        ` : ""}

        <p style="margin-top: 24px; font-size: 13px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          Este es un correo automático generado por el sistema EvalTIC del SENA. No respondas a este correo.
        </p>
      </div>
    </div>
  `;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id: evaluacionId } = await params;

  // 1. Verificar que la evaluación pertenece al instructor y cargar fichas + aprendices
  const evaluacion = await prisma.evaluacion.findFirst({
    where: { id: evaluacionId, instructorId: session.user.instructorId },
    select: {
      nombre: true,
      maxIntentos: true,
      fechaInicio: true,
      fechaFin: true,
      instructor: {
        select: { email: true, resendApiKey: true },
      },
      fichas: {
        select: {
          id: true,
          numero: true,
          programa: true,
          fechaInicio: true,
          fechaFin: true,
          aprendices: {
            select: { nombres: true, apellidos: true, emailPersonal: true },
          },
        },
      },
    },
  });

  if (!evaluacion) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  const { resendApiKey } = evaluacion.instructor;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "El instructor no tiene una API key de Resend configurada" },
      { status: 422 },
    );
  }

  // 2. Parsear body
  const rawBody = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { mensaje } = parsed.data;

  // 3. Preparar Resend
  const senderConfig = await prisma.appConfig.findUnique({
    where: { clave: "senderEmail" },
  });
  const senderEmail = senderConfig?.valor ?? "EvalTIC SENA <onboarding@resend.dev>";
  const apiKey = safeDecrypt(resendApiKey);
  const resend = new Resend(apiKey);

  // 4. Enviar a todas las fichas
  let enviados = 0;
  let sinEmail = 0;

  for (const ficha of evaluacion.fichas) {
    const conEmail = ficha.aprendices.filter((a) => a.emailPersonal);
    sinEmail += ficha.aprendices.length - conEmail.length;

    const fechaInicio = formatFechaEsCO(ficha.fechaInicio ?? evaluacion.fechaInicio);
    const fechaFin    = formatFechaEsCO(ficha.fechaFin    ?? evaluacion.fechaFin);

    for (const aprendiz of conEmail) {
      const html = buildHtmlNotificacion({
        nombres:          aprendiz.nombres,
        evaluacionNombre: evaluacion.nombre,
        fichaNumero:      ficha.numero,
        fichaPrograma:    ficha.programa,
        fechaInicio,
        fechaFin,
        maxIntentos:      evaluacion.maxIntentos,
        mensaje,
      });

      try {
        const { error } = await resend.emails.send({
          from: senderEmail,
          to: [aprendiz.emailPersonal!],
          subject: `Evaluación disponible: ${evaluacion.nombre} — Ficha ${ficha.numero}`,
          html,
        });
        if (!error) enviados++;
        else console.warn(`Resend error para ${aprendiz.emailPersonal}:`, error);
      } catch (err) {
        console.warn(`Fallo de envío para ${aprendiz.emailPersonal}:`, err);
      }
    }
  }

  // 5. Resumen al instructor (fire-and-forget)
  ;(async () => {
    try {
      const htmlResumen = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="background-color:#00324D;padding:20px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;">Resumen de notificación</h1>
            <p style="color:#ffffff;margin:5px 0 0 0;opacity:0.8;">EvalTIC SENA</p>
          </div>
          <div style="padding:24px;background-color:#fafafa;">
            <p style="font-size:15px;color:#374151;margin-top:0;">
              La convocatoria fue enviada a los aprendices de <strong>${evaluacion.fichas.length}</strong> ficha${evaluacion.fichas.length !== 1 ? "s" : ""}.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tbody>
                <tr><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;width:50%;">Evaluación</td><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;font-weight:500;">${evaluacion.nombre}</td></tr>
                <tr><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">Fichas notificadas</td><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">${evaluacion.fichas.length}</td></tr>
                <tr><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">Correos enviados</td><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">${enviados}</td></tr>
                <tr><td style="padding:7px 0;color:#6b7280;">Sin correo registrado</td><td style="padding:7px 0;">${sinEmail}</td></tr>
              </tbody>
            </table>
            ${mensaje ? `
            <div style="margin-top:16px;padding:14px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:14px;color:#166534;">
              <strong>Mensaje enviado a los aprendices:</strong><br/>${mensaje}
            </div>` : ""}
            <p style="margin-top:24px;font-size:13px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:15px;">
              Este es un correo automático generado por el sistema EvalTIC del SENA.
            </p>
          </div>
        </div>
      `;
      await resend.emails.send({
        from: senderEmail,
        to: [evaluacion.instructor.email],
        subject: `Notificación enviada — ${evaluacion.nombre} (${evaluacion.fichas.length} ficha${evaluacion.fichas.length !== 1 ? "s" : ""})`,
        html: htmlResumen,
      });
    } catch (err) {
      console.warn("Error al enviar resumen al instructor:", err);
    }
  })();

  return NextResponse.json({ enviados, sinEmail, fichas: evaluacion.fichas.length });
}
