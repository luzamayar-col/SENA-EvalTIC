import { notFound } from "next/navigation";
import Link from "next/link";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { InstructorStatCard } from "@/components/molecules/InstructorStatCard";
import { FichaDetailClient } from "@/components/organisms/FichaDetailClient";
import { Button } from "@/components/ui/button";
import { Layers, Users, ClipboardList, TrendingUp, BarChart2, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FichaDetailPage({ params }: Props) {
  const session = await requireInstructor();
  const { id } = await params;

  // Fetch ficha with ownership check
  const ficha = await prisma.ficha.findFirst({
    where: { id, evaluacion: { instructorId: session.user.instructorId } },
    include: {
      evaluacion: {
        select: {
          id: true,
          nombre: true,
          competencia: true,
          maxIntentos: true,
          activa: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
  });

  if (!ficha) notFound();

  // Fetch aprendices with their result stats
  const aprendicesRaw = await prisma.aprendiz.findMany({
    where: { fichaId: id },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  const resultadosPorCedula = await prisma.resultado.groupBy({
    by: ["cedula"],
    where: { fichaId: id, esPrueba: false },
    _count: { id: true },
    _max: { presentadoEn: true },
  });

  const ultimosResultados = await prisma.resultado.findMany({
    where: {
      fichaId: id,
      esPrueba: false,
      cedula: { in: aprendicesRaw.map((a) => a.cedula) },
    },
    orderBy: { presentadoEn: "desc" },
    distinct: ["cedula"],
  });

  const ultimoMap = new Map(
    ultimosResultados.map((r) => [r.cedula, r])
  );
  const intentosUsadosMap = new Map(
    resultadosPorCedula.map((g) => [g.cedula, g._count.id])
  );

  const aprendices = aprendicesRaw.map((a) => {
    const ultimo = ultimoMap.get(a.cedula) ?? null;
    return {
      id: a.id,
      cedula: a.cedula,
      tipoDocumento: a.tipoDocumento,
      nombres: a.nombres,
      apellidos: a.apellidos,
      email: a.email,
      intentosExtra: a.intentosExtra,
      intentosUsados: intentosUsadosMap.get(a.cedula) ?? 0,
      intentosPermitidos: ficha.evaluacion.maxIntentos + a.intentosExtra,
      ultimoResultado: ultimo
        ? {
            intento: ultimo.intento,
            puntaje: ultimo.puntaje,
            aprobado: ultimo.aprobado,
            presentadoEn: ultimo.presentadoEn.toISOString(),
          }
        : null,
    };
  });

  // Fetch resultados for this ficha
  const resultadosRaw = await prisma.resultado.findMany({
    where: { fichaId: id },
    orderBy: { presentadoEn: "desc" },
    take: 200,
  });

  const resultados = resultadosRaw.map((r) => ({
    id: r.id,
    nombres: r.nombres,
    apellidos: r.apellidos,
    cedula: r.cedula,
    tipoDocumento: r.tipoDocumento,
    email: r.email,
    puntaje: r.puntaje,
    aprobado: r.aprobado,
    preguntasCorrectas: r.preguntasCorrectas,
    totalPreguntas: r.totalPreguntas,
    tiempoUsado: r.tiempoUsado,
    intento: r.intento,
    esPrueba: r.esPrueba,
    presentadoEn: r.presentadoEn.toISOString(),
  }));

  // Stats
  const realResultados = resultados.filter((r) => !r.esPrueba);
  const totalPresentaciones = realResultados.length;

  const aprobadosCedulas = new Set(
    realResultados.filter((r) => r.aprobado).map((r) => r.cedula)
  );
  const aprendicesAprobados = aprobadosCedulas.size;
  const tasaAprobacion =
    aprendices.length > 0 ? Math.round((aprendicesAprobados / aprendices.length) * 100) : 0;
  const promedioPuntaje =
    totalPresentaciones > 0
      ? Math.round(realResultados.reduce((sum, r) => sum + r.puntaje, 0) / totalPresentaciones)
      : 0;

  const exportExcelUrl = `/api/instructor/resultados/export-excel?fichaId=${id}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start gap-3">
        <Layers size={24} className="text-sena-green mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-sena-gray-dark/50 mb-1">
            <Link href="/instructor/fichas" className="hover:text-sena-blue">
              Fichas
            </Link>
            <span>/</span>
            <span className="font-semibold text-sena-blue">{ficha.numero}</span>
          </div>
          <h1 className="text-2xl font-black text-sena-blue truncate">
            Ficha {ficha.numero}
          </h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5 truncate">{ficha.programa}</p>
          <p className="text-xs text-sena-gray-dark/40 mt-0.5 truncate">
            Evaluación: {ficha.evaluacion.nombre}
          </p>
        </div>
        <Link href="/instructor/fichas">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Fichas</span>
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InstructorStatCard
          title="Aprendices"
          value={aprendices.length}
          icon={Users}
          color="blue"
          description="En el roster de esta ficha"
        />
        <InstructorStatCard
          title="Presentaciones"
          value={totalPresentaciones}
          icon={ClipboardList}
          color="green"
          description="Evaluaciones presentadas"
        />
        <InstructorStatCard
          title="Tasa aprobación"
          value={`${tasaAprobacion}%`}
          icon={TrendingUp}
          color={tasaAprobacion >= 65 ? "green" : tasaAprobacion >= 40 ? "amber" : "red"}
          description={`${aprendicesAprobados} de ${aprendices.length} aprendices`}
        />
        <InstructorStatCard
          title="Promedio"
          value={`${promedioPuntaje}%`}
          icon={BarChart2}
          color={promedioPuntaje >= 65 ? "green" : promedioPuntaje >= 40 ? "amber" : "red"}
          description="Puntaje promedio obtenido"
        />
      </div>

      {/* Tabs: Aprendices / Resultados */}
      <FichaDetailClient
        fichaId={id}
        aprendices={aprendices}
        evaluacionMaxIntentos={ficha.evaluacion.maxIntentos}
        resultados={resultados}
        exportExcelUrl={exportExcelUrl}
      />
    </div>
  );
}
