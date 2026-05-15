import { notFound } from "next/navigation";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { EvaluacionFormTemplate } from "@/components/templates/EvaluacionFormTemplate";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editar Evaluación — EvalTIC Instructor",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarEvaluacionPage({ params }: Props) {
  const session = await requireInstructor();
  const { id } = await params;

  const evaluacion = await prisma.evaluacion.findFirst({
    where: { id, instructorId: session.user.instructorId },
  });

  if (!evaluacion) notFound();

  // Build defaultValues from DB record
  const config = evaluacion.config as {
    timeLimitMinutes: number;
    passingScorePercentage: number;
    distribucionPreguntas: {
      seleccion_unica: number;
      seleccion_multiple: number;
      emparejamiento: number;
    };
    umbralAntiplagio?: { medio: number; alto: number };
  };

  const defaultValues = {
    nombre: evaluacion.nombre,
    descripcion: evaluacion.descripcion ?? "",
    competencia: evaluacion.competencia,
    codigoCompetencia: evaluacion.codigoCompetencia,
    resultadoAprendizaje: evaluacion.resultadoAprendizaje,
    codigoRA: evaluacion.codigoRA,
    fechaInicio: evaluacion.fechaInicio
      ? evaluacion.fechaInicio.toISOString()
      : "",
    fechaFin: evaluacion.fechaFin
      ? evaluacion.fechaFin.toISOString()
      : "",
    timeLimitMinutes: config.timeLimitMinutes,
    passingScorePercentage: config.passingScorePercentage,
    maxIntentos: evaluacion.maxIntentos,
    seleccion_unica: config.distribucionPreguntas.seleccion_unica,
    seleccion_multiple: config.distribucionPreguntas.seleccion_multiple,
    emparejamiento: config.distribucionPreguntas.emparejamiento,
    umbralMedio: config.umbralAntiplagio?.medio ?? 3,
    umbralAlto: config.umbralAntiplagio?.alto ?? 5,
  };

  const preguntas = evaluacion.preguntas as unknown[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Pencil size={24} className="text-sena-green" />
        <div>
          <h1 className="text-2xl font-black text-sena-blue">Editar Evaluación</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5">{evaluacion.nombre}</p>
        </div>
      </div>

      <EvaluacionFormTemplate
        mode="edit"
        evaluacionId={evaluacion.id}
        defaultValues={defaultValues}
        defaultPreguntas={preguntas}
      />
    </div>
  );
}
