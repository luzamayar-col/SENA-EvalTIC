"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface Evaluacion {
  id: string;
  nombre: string;
}

interface Ficha {
  id: string;
  numero: string;
  programa: string;
}

interface ResultadosFiltersProps {
  evaluaciones: Evaluacion[];
  fichas: Ficha[];
}

export function ResultadosFilters({ evaluaciones, fichas }: ResultadosFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page"); // reset pagination on filter change
      return params.toString();
    },
    [searchParams]
  );

  const hasFilters =
    searchParams.has("evaluacionId") ||
    searchParams.has("fichaId") ||
    searchParams.has("aprobado");

  return (
    <div className="bg-white border border-sena-gray-dark/10 rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sena-blue font-semibold text-sm mr-2">
          <Filter size={16} className="text-sena-green" />
          Filtros
        </div>

        {/* Filter: Evaluación */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs text-sena-gray-dark/60 font-medium">Evaluación</label>
          <Select
            value={searchParams.get("evaluacionId") ?? "all"}
            onValueChange={(val) =>
              router.push(
                `${pathname}?${createQueryString({
                  evaluacionId: val === "all" ? null : val,
                  fichaId: null, // reset ficha when evaluacion changes
                })}`,
              )
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las evaluaciones</SelectItem>
              {evaluaciones.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>
                  {ev.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter: Ficha */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs text-sena-gray-dark/60 font-medium">Ficha</label>
          <Select
            value={searchParams.get("fichaId") ?? "all"}
            onValueChange={(val) =>
              router.push(
                `${pathname}?${createQueryString({ fichaId: val === "all" ? null : val })}`,
              )
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fichas</SelectItem>
              {fichas.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.numero} — {f.programa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter: Resultado */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-sena-gray-dark/60 font-medium">Resultado</label>
          <Select
            value={searchParams.get("aprobado") ?? "all"}
            onValueChange={(val) =>
              router.push(
                `${pathname}?${createQueryString({ aprobado: val === "all" ? null : val })}`,
              )
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Aprobados</SelectItem>
              <SelectItem value="false">No aprobados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5"
            onClick={() => router.push(pathname)}
          >
            <X size={14} />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
