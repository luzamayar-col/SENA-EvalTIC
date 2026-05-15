import { FormularioRegistro } from "@/components/templates/FormularioRegistro";
import { ShieldCheckIcon, TimerIcon, AlertTriangle } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getEffectiveDates, isVigente } from "@/lib/effective-dates";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let fichas: { numero: string; programa: string }[] = [];

  if (APP_CONFIG.useDatabaseBackend) {
    const now = new Date();
    // WHERE ampliado: incluye fichas donde la evaluación esté vigente
    // O donde la ficha tenga fechas propias vigentes (override)
    const rawFichas = await prisma.ficha.findMany({
      where: {
        activa: true,
        evaluacion: { activa: true },
        OR: [
          // Evaluación dentro de vigencia (comportamiento previo)
          {
            evaluacion: {
              AND: [
                { OR: [{ fechaInicio: null }, { fechaInicio: { lte: now } }] },
                { OR: [{ fechaFin: null }, { fechaFin: { gte: now } }] },
              ],
            },
          },
          // Ficha con al menos una fecha propia (post-filter isVigente decide la vigencia exacta)
          {
            OR: [
              { fechaInicio: { not: null } },
              { fechaFin: { not: null } },
            ],
          },
        ],
      },
      select: {
        numero: true,
        programa: true,
        fechaInicio: true,
        fechaFin: true,
        evaluacion: { select: { fechaInicio: true, fechaFin: true } },
      },
      orderBy: { numero: "asc" },
    });

    // Post-filter JS con fechas efectivas para afinar (ej: ficha.fechaFin < now aunque eval vigente)
    fichas = rawFichas
      .filter((f) => isVigente(getEffectiveDates(f, f.evaluacion), now).ok)
      .map(({ numero, programa }) => ({ numero, programa }));
  }

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] bg-sena-gray-light/30">
      {/* Hero / Title Banner */}
      <section className="w-full bg-sena-white border-b border-sena-gray-dark/10 py-10 sm:py-14 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sena-green tracking-tight animate-slideLeftAndFade">
            Plataforma de evaluación de conocimientos en línea
          </h2>
          <p className="text-sm sm:text-base text-sena-gray-dark/80 mt-3 leading-relaxed">
            Bienvenido a la evaluación técnica de conocimientos del programa de
            formación. Deberá demostrar sus competencias acorde a los resultados
            de aprendizaje y respectivo contenido temático.
          </p>
        </div>
      </section>

      {/* Instructions — horizontal cards strip */}
      <section className="w-full bg-sena-white/60 border-b border-sena-gray-dark/5 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h3 className="text-lg font-bold text-sena-blue mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-sena-green" />
            Instrucciones
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="flex gap-3 bg-white rounded-xl p-4 border border-sena-gray-dark/10 shadow-sm">
              <TimerIcon className="w-6 h-6 shrink-0 text-sena-green mt-0.5" />
              <div className="text-sm text-sena-gray-dark/90">
                <p className="font-semibold text-sena-blue mb-1">
                  Tiempo Límite
                </p>
                <p>
                  Tendrá 15 minutos para completar la prueba. El temporizador
                  comenzará tras el registro.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex gap-3 bg-white rounded-xl p-4 border border-sena-gray-dark/10 shadow-sm">
              <ShieldCheckIcon className="w-6 h-6 shrink-0 text-sena-green mt-0.5" />
              <div className="text-sm text-sena-gray-dark/90">
                <p className="font-semibold text-sena-blue mb-1">Formato</p>
                <p>
                  10 preguntas seleccionadas aleatoriamente. Incluye selección
                  única, múltiple y emparejamiento.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex gap-3 bg-white rounded-xl p-4 border border-sena-gray-dark/10 shadow-sm">
              <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500 mt-0.5" />
              <div className="text-sm text-sena-gray-dark/90">
                <p className="font-semibold text-sena-blue mb-1">Importante</p>
                <p>
                  Si el tiempo expira, la prueba se enviará automáticamente con
                  las respuestas guardadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form — centered, full width */}
      <section className="flex-1 flex items-start justify-center py-8 sm:py-10 px-4">
        <div className="w-full max-w-5xl animate-slideUpAndFade">
          <FormularioRegistro fichas={fichas} />
        </div>
      </section>
    </div>
  );
}
