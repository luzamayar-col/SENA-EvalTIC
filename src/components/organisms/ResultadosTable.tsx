"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ResultadoBadge } from "@/components/molecules/ResultadoBadge";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn, fmtScore } from "@/lib/utils";

interface Resultado {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  tipoDocumento: string;
  email: string;
  puntaje: number;
  aprobado: boolean;
  preguntasCorrectas: number;
  totalPreguntas: number;
  tiempoUsado: number;
  presentadoEn: string;
  ficha: {
    numero: string;
    programa: string;
  };
}

interface ResultadosTableProps {
  resultados: Resultado[];
  page: number;
  totalPages: number;
  total: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function ResultadosTable({ resultados, page, totalPages, total }: ResultadosTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (resultados.length === 0) {
    return (
      <div className="text-center py-16 text-sena-gray-dark/50">
        <p className="font-semibold">No hay resultados para mostrar.</p>
        <p className="text-sm mt-1">
          Los resultados aparecerán aquí cuando los aprendices presenten la evaluación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sena-gray-dark/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-sena-gray-light/50 hover:bg-sena-gray-light/50">
              <TableHead className="font-bold text-sena-blue">Fecha</TableHead>
              <TableHead className="font-bold text-sena-blue">Aprendiz</TableHead>
              <TableHead className="font-bold text-sena-blue hidden md:table-cell">
                Cédula
              </TableHead>
              <TableHead className="font-bold text-sena-blue hidden lg:table-cell">
                Ficha
              </TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Puntaje</TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Estado</TableHead>
              <TableHead className="font-bold text-sena-blue text-center hidden md:table-cell">
                Tiempo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultados.map((r) => (
              <TableRow key={r.id} className="hover:bg-sena-gray-light/30">
                <TableCell className="text-xs text-sena-gray-dark/60 whitespace-nowrap">
                  {new Date(r.presentadoEn).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-sena-blue text-sm">
                      {r.nombres} {r.apellidos}
                    </p>
                    <p className="text-xs text-sena-gray-dark/50">{r.email}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm text-sena-gray-dark/70">
                    {r.tipoDocumento}: {r.cedula}
                  </p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div>
                    <p className="text-sm font-semibold text-sena-blue">{r.ficha.numero}</p>
                    <p className="text-xs text-sena-gray-dark/50 max-w-[180px] truncate">
                      {r.ficha.programa}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={cn(
                      "text-xl font-black",
                      r.puntaje >= 65
                        ? "text-sena-green"
                        : r.puntaje >= 40
                          ? "text-amber-600"
                          : "text-red-500",
                    )}
                  >
                    {fmtScore(r.puntaje)}%
                  </span>
                  <p className="text-[10px] text-sena-gray-dark/50">
                    {fmtScore(r.puntaje / 100 * r.totalPreguntas)}/{r.totalPreguntas}
                  </p>
                </TableCell>
                <TableCell className="text-center">
                  <ResultadoBadge aprobado={r.aprobado} size="sm" />
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-sena-gray-dark/60">
                    <Clock size={12} />
                    {formatTime(r.tiempoUsado)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-sena-gray-dark/60">
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="gap-1"
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="gap-1"
            >
              Siguiente
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
