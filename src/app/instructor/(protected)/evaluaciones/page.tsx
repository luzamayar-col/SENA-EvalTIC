import Link from "next/link";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { EvaluacionesTable } from "@/components/organisms/EvaluacionesTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EvaluacionesPage() {
  const session = await requireInstructor();

  const evaluaciones = await prisma.evaluacion.findMany({
    where: { instructorId: session.user.instructorId },
    include: {
      _count: { select: { fichas: true, resultados: true } },
    },
    orderBy: { creadoEn: "desc" },
  });

  // Serialize dates to strings for client components
  const serialized = evaluaciones.map((ev) => ({
    ...ev,
    preguntas: undefined,
    config: undefined,
    creadoEn: ev.creadoEn.toISOString(),
    actualizadoEn: ev.actualizadoEn.toISOString(),
    fechaInicio: ev.fechaInicio?.toISOString() ?? null,
    fechaFin: ev.fechaFin?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-sena-blue">Evaluaciones</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5">
            Gestiona tu banco de evaluaciones, actívalas y asocia fichas.
          </p>
        </div>
        <Link href="/instructor/evaluaciones/nueva">
          <Button className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2 shadow-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva Evaluación</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </Link>
      </div>

      <EvaluacionesTable evaluaciones={serialized} />
    </div>
  );
}
