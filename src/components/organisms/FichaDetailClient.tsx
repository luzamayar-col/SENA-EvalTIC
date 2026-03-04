"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AprendicesTable, type AprendizRow } from "@/components/organisms/AprendicesTable";
import { ExcelUploader } from "@/components/molecules/ExcelUploader";
import { ResultadoBadge } from "@/components/molecules/ResultadoBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileSpreadsheet, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultadoRow {
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
  intento: number;
  esPrueba: boolean;
  presentadoEn: string;
}

interface FichaDetailClientProps {
  fichaId: string;
  aprendices: AprendizRow[];
  evaluacionMaxIntentos: number;
  resultados: ResultadoRow[];
  exportExcelUrl: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function FichaDetailClient({
  fichaId,
  aprendices,
  evaluacionMaxIntentos,
  resultados,
  exportExcelUrl,
}: FichaDetailClientProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);

  const visibleResultados = resultados.filter((r) => !r.esPrueba);

  return (
    <Tabs defaultValue="aprendices" className="space-y-4">
      <TabsList>
        <TabsTrigger value="aprendices">
          Aprendices
          <Badge variant="outline" className="ml-1.5 text-xs">{aprendices.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="resultados">
          Resultados
          <Badge variant="outline" className="ml-1.5 text-xs">{visibleResultados.length}</Badge>
        </TabsTrigger>
      </TabsList>

      {/* ── Aprendices tab ── */}
      <TabsContent value="aprendices" className="space-y-4">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm text-sena-gray-dark/60">
            {aprendices.length} aprendice{aprendices.length !== 1 ? "s" : ""} en esta ficha
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Import Excel */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-sena-green text-sena-green hover:bg-sena-green hover:text-white font-semibold"
                >
                  <FileSpreadsheet size={14} />
                  Importar Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-sena-blue">Importar aprendices desde Excel</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-sena-gray-dark/60 -mt-1">
                  Compatible con listados de SOFIA Plus. El número de ficha se toma del contexto actual.
                </p>
                <ExcelUploader
                  fichaId={fichaId}
                  onImportComplete={() => {
                    setImportOpen(false);
                    router.refresh();
                  }}
                />
              </DialogContent>
            </Dialog>

            {/* Download template */}
            <a href="/api/instructor/templates/aprendices" download>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-sena-gray-dark/60 hover:text-sena-blue"
              >
                <Download size={14} />
                Plantilla
              </Button>
            </a>
          </div>
        </div>

        <AprendicesTable
          aprendices={aprendices}
          evaluacionMaxIntentos={evaluacionMaxIntentos}
          fichaId={fichaId}
        />
      </TabsContent>

      {/* ── Resultados tab ── */}
      <TabsContent value="resultados" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-sena-gray-dark/60">
            {visibleResultados.length} presentación{visibleResultados.length !== 1 ? "es" : ""}
          </p>
          <a href={exportExcelUrl} download>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-sena-green text-sena-green hover:bg-sena-green hover:text-white font-semibold"
            >
              <Download size={14} />
              Exportar Excel
            </Button>
          </a>
        </div>

        {visibleResultados.length === 0 ? (
          <div className="text-center py-16 text-sena-gray-dark/50">
            <p className="font-semibold">Aún no hay resultados.</p>
            <p className="text-sm mt-1">Aparecerán aquí cuando los aprendices presenten la evaluación.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-sena-gray-dark/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-sena-gray-light/50 hover:bg-sena-gray-light/50">
                  <TableHead className="font-bold text-sena-blue">Fecha</TableHead>
                  <TableHead className="font-bold text-sena-blue">Aprendiz</TableHead>
                  <TableHead className="font-bold text-sena-blue hidden md:table-cell">Cédula</TableHead>
                  <TableHead className="font-bold text-sena-blue text-center">Intento</TableHead>
                  <TableHead className="font-bold text-sena-blue text-center">Puntaje</TableHead>
                  <TableHead className="font-bold text-sena-blue text-center">Estado</TableHead>
                  <TableHead className="font-bold text-sena-blue text-center hidden md:table-cell">Tiempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleResultados.map((r) => (
                  <TableRow key={r.id} className="hover:bg-sena-gray-light/30">
                    <TableCell className="text-xs text-sena-gray-dark/60 whitespace-nowrap">
                      {new Date(r.presentadoEn).toLocaleDateString("es-CO", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sena-blue text-sm">
                        {r.nombres} {r.apellidos}
                      </p>
                      <p className="text-xs text-sena-gray-dark/50">{r.email}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-sena-gray-dark/70 font-mono">{r.cedula}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-sena-gray-dark/60 font-semibold">#{r.intento}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-xl font-black",
                          r.puntaje >= 65 ? "text-sena-green"
                          : r.puntaje >= 40 ? "text-amber-600"
                          : "text-red-500"
                        )}
                      >
                        {r.puntaje}%
                      </span>
                      <p className="text-[10px] text-sena-gray-dark/50">
                        {r.preguntasCorrectas}/{r.totalPreguntas}
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
        )}
      </TabsContent>
    </Tabs>
  );
}
