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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireInstructor();
  const instructorId = session.user.instructorId;

  // Fetch stats + email config directly from DB (server component)
  const [evaluaciones, resultados, instructorConfig] = await Promise.all([
    prisma.evaluacion.findMany({
      where: { instructorId },
      include: { _count: { select: { resultados: true } } },
    }),
    prisma.resultado.findMany({
      where: { evaluacion: { instructorId } },
      select: {
        puntaje: true,
        aprobado: true,
        ficha: { select: { numero: true } },
      },
    }),
    prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { emailNotificaciones: true, resendApiKey: true },
    }),
  ]);

  const totalResultados = resultados.length;
  const aprobados = resultados.filter((r) => r.aprobado).length;
  const tasaAprobacion =
    totalResultados > 0 ? Math.round((aprobados / totalResultados) * 100) : 0;
  const promedioGlobal =
    totalResultados > 0
      ? Math.round(
          resultados.reduce((sum, r) => sum + r.puntaje, 0) / totalResultados
        )
      : 0;
  const evaluacionesActivas = evaluaciones.filter((e) => e.activa).length;

  // Resultados por evaluación para mini-reporte
  const porEvaluacion = evaluaciones.map((ev) => ({
    nombre: ev.nombre.length > 40 ? ev.nombre.slice(0, 40) + "…" : ev.nombre,
    resultados: ev._count.resultados,
    activa: ev.activa,
  }));

  const emailSinConfigurar =
    !instructorConfig?.emailNotificaciones ||
    !instructorConfig?.resendApiKey;

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

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InstructorStatCard
          title="Total Presentaciones"
          value={totalResultados}
          icon={BarChart2}
          description="Evaluaciones completadas"
          color="blue"
        />
        <InstructorStatCard
          title="Tasa de Aprobación"
          value={`${tasaAprobacion}%`}
          icon={TrendingUp}
          description={`${aprobados} de ${totalResultados} aprobados`}
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

      {/* Evaluaciones overview */}
      <Card className="shadow-sm border-sena-gray-dark/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-sena-blue flex items-center gap-2 text-lg">
            <Users2 size={18} className="text-sena-green" />
            Presentaciones por evaluación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {porEvaluacion.length === 0 ? (
            <p className="text-sena-gray-dark/50 text-sm text-center py-8">
              No hay evaluaciones creadas aún.
            </p>
          ) : (
            <div className="space-y-3">
              {porEvaluacion.map((ev, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-sena-blue flex items-center gap-2 min-w-0">
                      {ev.activa && (
                        <span className="w-2 h-2 rounded-full bg-sena-green shrink-0" />
                      )}
                      <span className="truncate">{ev.nombre}</span>
                    </span>
                    <span className="font-bold text-sena-blue ml-2 shrink-0">
                      {ev.resultados}
                    </span>
                  </div>
                  <div className="w-full bg-sena-gray-light rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-sena-green rounded-full transition-all duration-700"
                      style={{
                        width: totalResultados > 0
                          ? `${Math.max(4, (ev.resultados / totalResultados) * 100)}%`
                          : "4%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
