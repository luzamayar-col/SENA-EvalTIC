import Link from "next/link";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { FichasTable } from "@/components/organisms/FichasTable";
import { FichaFormInline } from "@/components/molecules/FichaFormInline";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fichas — EvalTIC Instructor",
};

export default async function FichasPage() {
  const session = await requireInstructor();

  // Get all fichas for evaluaciones owned by this instructor
  const fichas = await prisma.ficha.findMany({
    where: {
      evaluacion: { instructorId: session.user.instructorId },
    },
    include: {
      evaluacion: {
        select: { id: true, nombre: true, activa: true, fechaInicio: true, fechaFin: true },
      },
      _count: { select: { resultados: true, aprendices: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
  // fichas incluye: fechaInicio, fechaFin a nivel ficha (nuevos campos)

  // Get evaluaciones for the select in the form
  const evaluaciones = await prisma.evaluacion.findMany({
    where: { instructorId: session.user.instructorId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const serializedFichas = fichas.map((f) => ({
    ...f,
    creadoEn: f.creadoEn.toISOString(),
    fechaInicio: f.fechaInicio?.toISOString() ?? null,
    fechaFin: f.fechaFin?.toISOString() ?? null,
    evaluacion: {
      ...f.evaluacion,
      fechaInicio: f.evaluacion.fechaInicio?.toISOString() ?? null,
      fechaFin: f.evaluacion.fechaFin?.toISOString() ?? null,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers size={24} className="text-sena-green" />
        <div>
          <h1 className="text-2xl font-black text-sena-blue">Fichas</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5">
            Asocia fichas de formación a evaluaciones activas.
          </p>
        </div>
      </div>

      {/* Inline form to create a ficha */}
      <FichaFormInline evaluaciones={evaluaciones} />

      {/* Table */}
      <FichasTable fichas={serializedFichas} />
    </div>
  );
}
