import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { InstructorStatCard } from "@/components/molecules/InstructorStatCard";
import {
  BarChart2,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Users2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export const dynamic = "force-dynamic";

function colorPorcentaje(valor: number, sinDatos: boolean) {
  if (sinDatos) return { dot: "bg-sena-gray-dark/20", text: "text-sena-gray-dark/40" };
  if (valor >= 65) return { dot: "bg-sena-green", text: "text-sena-green" };
  if (valor >= 40) return { dot: "bg-amber-500", text: "text-amber-600" };
  return { dot: "bg-red-500", text: "text-red-600" };
}

export default async function DashboardPage() {
  const session = await requireInstructor();
  const instructorId = session.user.instructorId;

  const [evaluaciones, instructorConfig] = await Promise.all([
    prisma.evaluacion.findMany({
      where: { instructorId },
      select: {
        id: true,
        nombre: true,
        activa: true,
        resultados: { select: { puntaje: true, aprobado: true } },
        fichas: { select: { _count: { select: { aprendices: true } } } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { emailNotificaciones: true, resendApiKey: true },
    }),
  ]);

  // Métricas globales
  const totalAprendices = evaluaciones.reduce(
    (sum, ev) => sum + ev.fichas.reduce((s, f) => s + f._count.aprendices, 0),
    0,
  );
  const totalResultados = evaluaciones.reduce((sum, ev) => sum + ev.resultados.length, 0);
  const totalAprobados  = evaluaciones.reduce((sum, ev) => sum + ev.resultados.filter((r) => r.aprobado).length, 0);
  const tasaAprobacion  = totalResultados > 0 ? Math.round((totalAprobados / totalResultados) * 100) : 0;
  const promedioGlobal  = totalResultados > 0
    ? Math.round(evaluaciones.reduce((sum, ev) => sum + ev.resultados.reduce((s, r) => s + r.puntaje, 0), 0) / totalResultados)
    : 0;
  const evaluacionesActivas = evaluaciones.filter((e) => e.activa).length;

  // Métricas por evaluación
  const statsEvaluaciones = evaluaciones.map((ev) => {
    const presentaciones = ev.resultados.length;
    const aprendices     = ev.fichas.reduce((s, f) => s + f._count.aprendices, 0);
    const aprobados      = ev.resultados.filter((r) => r.aprobado).length;
    const tasa           = presentaciones > 0 ? Math.round((aprobados / presentaciones) * 100) : 0;
    const promedio       = presentaciones > 0
      ? Math.round(ev.resultados.reduce((s, r) => s + r.puntaje, 0) / presentaciones)
      : 0;
    return { id: ev.id, nombre: ev.nombre, activa: ev.activa, presentaciones, aprendices, tasa, promedio };
  });

  const emailSinConfigurar = !instructorConfig?.emailNotificaciones || !instructorConfig?.resendApiKey;

  return (
    <div className="space-y-6">
      {/* Email config banner */}
      {emailSinConfigurar && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertDescription className="text-xs flex items-center justify-between gap-4">
            <span>
              {!instructorConfig?.emailNotificaciones
                ? "Las notificaciones de resultados por correo están desactivadas. Los resultados de tus aprendices no se enviarán automáticamente."
                : "Tienes las notificaciones activadas pero no has configurado tu API Key de Resend. Los correos no se enviarán."}
            </span>
            <Link
              href="/instructor/perfil"
              className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-700"
            >
              Configurar
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-sena-blue">Dashboard</h1>
        <p className="text-sm text-sena-gray-dark/60 mt-0.5">
          Bienvenido, {session.user.name}. Aquí tienes un resumen de tus evaluaciones.
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InstructorStatCard
          title="Total Presentaciones"
          value={`${totalResultados} / ${totalAprendices}`}
          icon={BarChart2}
          description="Presentaciones sobre total de aprendices"
          color="blue"
        />
        <InstructorStatCard
          title="Tasa de Aprobación"
          value={`${tasaAprobacion}%`}
          icon={TrendingUp}
          description={`${totalAprobados} de ${totalResultados} aprobados`}
          color={tasaAprobacion >= 65 ? "green" : tasaAprobacion >= 40 ? "amber" : "red"}
        />
        <InstructorStatCard
          title="Promedio Global"
          value={`${promedioGlobal}%`}
          icon={CheckCircle2}
          description="Puntaje promedio obtenido"
          color={promedioGlobal >= 65 ? "green" : promedioGlobal >= 40 ? "amber" : "red"}
        />
        <InstructorStatCard
          title="Evaluaciones Activas"
          value={evaluacionesActivas}
          icon={ClipboardList}
          description={`De ${evaluaciones.length} evaluaciones totales`}
          color="green"
        />
      </div>

      {/* Cards por evaluación */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users2 size={18} className="text-sena-green" />
          <h2 className="text-base font-bold text-sena-blue">Rendimiento por evaluación</h2>
        </div>

        {statsEvaluaciones.length === 0 ? (
          <p className="text-sena-gray-dark/50 text-sm text-center py-12 border-2 border-dashed border-sena-gray-dark/10 rounded-xl">
            No hay evaluaciones creadas aún.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statsEvaluaciones.map((ev) => {
              const sinDatos  = ev.presentaciones === 0;
              const colorTasa = colorPorcentaje(ev.tasa, sinDatos);
              const colorProm = colorPorcentaje(ev.promedio, sinDatos);

              return (
                <div
                  key={ev.id}
                  className="border border-sena-gray-dark/10 rounded-xl p-4 space-y-3 bg-white shadow-sm"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sena-blue text-sm leading-tight line-clamp-2">
                      {ev.nombre}
                    </p>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ev.activa
                          ? "bg-sena-green/10 text-sena-green"
                          : "bg-sena-gray-dark/10 text-sena-gray-dark/50"
                      }`}
                    >
                      {ev.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-sena-gray-dark/5">
                    {/* Presentaciones */}
                    <div className="text-center">
                      <p className="text-lg font-black text-sena-blue leading-none">
                        {ev.presentaciones}
                        <span className="text-xs font-normal text-sena-gray-dark/40">
                          /{ev.aprendices}
                        </span>
                      </p>
                      <p className="text-[10px] text-sena-gray-dark/50 mt-1">Presentaciones</p>
                    </div>

                    {/* Tasa aprobación */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colorTasa.dot}`} />
                        <p className={`text-lg font-black leading-none ${colorTasa.text}`}>
                          {sinDatos ? "—" : `${ev.tasa}%`}
                        </p>
                      </div>
                      <p className="text-[10px] text-sena-gray-dark/50 mt-1">Aprobación</p>
                    </div>

                    {/* Promedio */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colorProm.dot}`} />
                        <p className={`text-lg font-black leading-none ${colorProm.text}`}>
                          {sinDatos ? "—" : `${ev.promedio}%`}
                        </p>
                      </div>
                      <p className="text-[10px] text-sena-gray-dark/50 mt-1">Promedio</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
