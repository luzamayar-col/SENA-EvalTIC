import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { ResultadosTable } from "@/components/organisms/ResultadosTable";
import { ResultadosFilters } from "@/components/molecules/ResultadosFilters";
import { Button } from "@/components/ui/button";
import { ClipboardList, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resultados — EvalTIC Instructor",
};

interface SearchParams {
  evaluacionId?: string;
  fichaId?: string;
  aprobado?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 20;

export default async function ResultadosPage({ searchParams }: Props) {
  const session = await requireInstructor();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const aprobadoFilter =
    sp.aprobado === "true" ? true : sp.aprobado === "false" ? false : undefined;

  const where = {
    evaluacion: { instructorId: session.user.instructorId },
    ...(sp.evaluacionId ? { evaluacionId: sp.evaluacionId } : {}),
    ...(sp.fichaId ? { fichaId: sp.fichaId } : {}),
    ...(aprobadoFilter !== undefined ? { aprobado: aprobadoFilter } : {}),
  };

  const [resultados, total, evaluaciones] = await Promise.all([
    prisma.resultado.findMany({
      where,
      include: {
        evaluacion: { select: { nombre: true } },
        ficha: { select: { numero: true, programa: true } },
      },
      orderBy: { presentadoEn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.resultado.count({ where }),
    prisma.evaluacion.findMany({
      where: { instructorId: session.user.instructorId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const serialized = resultados.map((r) => ({
    ...r,
    respuestas: undefined,
    presentadoEn: r.presentadoEn.toISOString(),
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build export URLs preserving filters
  const exportParams = new URLSearchParams();
  if (sp.evaluacionId) exportParams.set("evaluacionId", sp.evaluacionId);
  if (sp.fichaId) exportParams.set("fichaId", sp.fichaId);
  if (sp.aprobado) exportParams.set("aprobado", sp.aprobado);
  const exportCsvUrl = `/api/instructor/resultados/export?${exportParams.toString()}`;
  const exportExcelUrl = `/api/instructor/resultados/export-excel?${exportParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-sena-green" />
          <div>
            <h1 className="text-2xl font-black text-sena-blue">Resultados</h1>
            <p className="text-sm text-sena-gray-dark/60 mt-0.5">
              {total} resultado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportExcelUrl} download>
            <Button
              variant="outline"
              className="gap-2 border-sena-green text-sena-green hover:bg-sena-green hover:text-white font-semibold"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Excel</span>
            </Button>
          </a>
          <a href={exportCsvUrl} download>
            <Button variant="ghost" size="sm" className="gap-1.5 text-sena-gray-dark/50 hover:text-sena-blue text-xs">
              <Download size={12} />
              CSV
            </Button>
          </a>
        </div>
      </div>

      <ResultadosFilters evaluaciones={evaluaciones} />

      <ResultadosTable
        resultados={serialized}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
