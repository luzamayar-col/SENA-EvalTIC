"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ParsedAprendiz = {
  cedula: string;
  tipoDocumento: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  emailPersonal: string | null;
};

interface ImportResult {
  insertados: number;
  omitidos: number;
  errores: string[];
}

interface ExcelUploaderProps {
  fichaId: string;
  onImportComplete: (result: ImportResult) => void;
}

// ── SOFIA Plus parser ─────────────────────────────────────────────────────────

const COL_ALIASES: Record<string, string[]> = {
  cedula:        ["no. documento", "numero documento", "cedula", "cédula", "nro. documento", "documento", "nro documento"],
  tipoDocumento: ["tipo doc", "tipo de documento", "tipo documento", "tipo"],
  nombres:       ["nombres", "nombre"],
  apellidos:     ["apellidos", "apellido"],
  email:         ["correo misena", "correo sena", "correo institucional", "correo electrónico inst", "correo electronico inst", "correo", "email", "correo electrónico", "correo electronico"],
  emailPersonal: ["correo personal", "email personal", "correo electrónico personal", "correo electronico personal", "correo electronico personal", "correo alternativo"],
  estado:        ["estado aprendiz", "estado del aprendiz", "estado"],
};

// Estados de SOFIA Plus que NO se deben importar
const ESTADOS_INACTIVOS = ["retirado", "aplazado", "cancelado", "trasladado", "desercion"];

function isEstadoActivo(valor: string): boolean {
  if (!valor.trim()) return true; // sin estado = incluir
  const v = valor.toLowerCase().trim();
  return !ESTADOS_INACTIVOS.some((e) => v.includes(e));
}

function findCol(headers: string[], aliases: string[]): number | null {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return null;
}

// Normalize a cell for header matching: lowercase, strip internal \r\n, trim
function normalizeHeader(c: unknown): string {
  return String(c).toLowerCase().replace(/\r?\n/g, " ").trim();
}

// Valid Colombian document numbers: all digits (CC, TI, CE, PEP)
function isValidCedula(value: string): boolean {
  return /^\d+$/.test(value.replace(/[\s-]/g, ""));
}

async function parseSOFIAPlus(buffer: ArrayBuffer): Promise<ParsedAprendiz[]> {
  const XLSX = await import("xlsx");

  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // 1. Find header row (first row in first 20 with ≥2 keyword matches)
  const KEYWORDS = Object.keys(COL_ALIASES).flatMap((k) => COL_ALIASES[k]);
  let headerRowIndex = -1;

  for (let i = 0; i < rows.length && i < 20; i++) {
    const rowLower = rows[i].map(normalizeHeader);
    const matches = KEYWORDS.filter((kw) => rowLower.some((c: string) => c.includes(kw))).length;
    if (matches >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "No se encontró la fila de encabezados. Asegúrese de que el archivo tiene columnas de cédula, nombres y apellidos."
    );
  }

  // 2. Map columns (normalizeHeader handles "Tipo\r\nDoc." → "tipo doc.")
  const headers = rows[headerRowIndex].map(normalizeHeader);
  const colMap = {
    cedula:        findCol(headers, COL_ALIASES.cedula),
    tipoDocumento: findCol(headers, COL_ALIASES.tipoDocumento),
    nombres:       findCol(headers, COL_ALIASES.nombres),
    apellidos:     findCol(headers, COL_ALIASES.apellidos),
    email:         findCol(headers, COL_ALIASES.email),
    emailPersonal: findCol(headers, COL_ALIASES.emailPersonal),
    estado:        findCol(headers, COL_ALIASES.estado),
  };

  if (colMap.cedula == null || colMap.nombres == null || colMap.apellidos == null) {
    throw new Error(
      "No se encontraron las columnas requeridas (cédula, nombres, apellidos). Revise el archivo."
    );
  }

  // 3. Parse data rows — filter out inactive learners and non-numeric cedulas (e.g. legend rows)
  return rows
    .slice(headerRowIndex + 1)
    .filter((row) => {
      const cedula = String(row[colMap.cedula!] ?? "").trim();
      return cedula !== "" && isValidCedula(cedula);
    })
    .filter((row) => {
      if (colMap.estado == null) return true;
      return isEstadoActivo(String(row[colMap.estado] ?? ""));
    })
    .map((row) => ({
      cedula:        String(row[colMap.cedula!] ?? "").trim(),
      tipoDocumento: colMap.tipoDocumento != null
        ? (String(row[colMap.tipoDocumento] ?? "").trim() || "CC")
        : "CC",
      nombres:       String(row[colMap.nombres!] ?? "").trim(),
      apellidos:     String(row[colMap.apellidos!] ?? "").trim(),
      email:         colMap.email != null
        ? (String(row[colMap.email] ?? "").trim() || null)
        : null,
      emailPersonal: colMap.emailPersonal != null
        ? (String(row[colMap.emailPersonal] ?? "").trim() || null)
        : null,
    }))
    .filter((r) => r.cedula && r.nombres && r.apellidos);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExcelUploader({ fichaId, onImportComplete }: ExcelUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAprendiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError("El archivo debe ser de tipo Excel (.xlsx o .xls)");
      return;
    }
    setError(null);
    setImportResult(null);

    const buffer = await file.arrayBuffer();
    try {
      const rows = await parseSOFIAPlus(buffer);
      if (rows.length === 0) {
        setError("El archivo no contiene filas de datos válidas.");
        return;
      }
      setParsed(rows);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer el archivo Excel");
      setParsed(null);
      setFileName(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  };

  const handleClear = () => {
    setParsed(null);
    setFileName(null);
    setError(null);
    setImportResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleConfirm = async () => {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/instructor/fichas/${fichaId}/aprendices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprendices: parsed, mode: "bulk" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al importar");
        return;
      }
      const result: ImportResult = {
        insertados: data.insertados ?? 0,
        omitidos:   data.omitidos ?? 0,
        errores:    data.errores ?? [],
      };
      setImportResult(result);
      onImportComplete(result);
      handleClear();
    } finally {
      setImporting(false);
    }
  };

  const preview = parsed?.slice(0, 5) ?? [];

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !parsed && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all",
          parsed ? "border-sena-green/40 bg-sena-green/5" : "cursor-pointer",
          isDragOver
            ? "border-sena-green bg-sena-green/5"
            : !parsed
            ? "border-sena-gray-dark/20 bg-sena-gray-light/50 hover:border-sena-green/50 hover:bg-sena-green/5"
            : ""
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="flex flex-col items-center gap-2">
          {fileName ? (
            <FileSpreadsheet size={32} className="text-sena-green" />
          ) : (
            <Upload size={32} className="text-sena-gray-dark/40" />
          )}
          {fileName ? (
            <div>
              <p className="text-sm font-semibold text-sena-green">{fileName}</p>
              <p className="text-xs text-sena-gray-dark/50 mt-0.5">
                {parsed?.length} aprendices detectados
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-sena-blue">
                Arrastre el listado Excel aquí
              </p>
              <p className="text-xs text-sena-gray-dark/50 mt-0.5">
                Compatible con SOFIA Plus · .xlsx o .xls
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="flex items-start gap-2 bg-sena-green/5 border border-sena-green/20 rounded-lg p-3 text-sm text-sena-blue">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-sena-green" />
          <span>
            <span className="font-bold">{importResult.insertados} aprendices importados</span>
            {importResult.omitidos > 0 && (
              <span className="text-sena-gray-dark/60">, {importResult.omitidos} omitidos (ya existían)</span>
            )}
          </span>
        </div>
      )}

      {/* Preview table */}
      {parsed && parsed.length > 0 && (
        <div className="bg-sena-green/5 border border-sena-green/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-sena-green" />
              <p className="text-sm font-bold text-sena-blue">
                {parsed.length} aprendices listos para importar
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-sena-gray-dark/50 hover:text-red-500 h-auto p-1"
            >
              <X size={14} />
            </Button>
          </div>

          {/* Preview rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-sena-blue font-semibold border-b border-sena-gray-dark/10">
                  <th className="text-left pb-1 pr-3">Cédula</th>
                  <th className="text-left pb-1 pr-3">Tipo</th>
                  <th className="text-left pb-1 pr-3">Nombres</th>
                  <th className="text-left pb-1 pr-3">Apellidos</th>
                  <th className="text-left pb-1 pr-3">Correo inst.</th>
                  <th className="text-left pb-1">Correo personal</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-sena-gray-dark/5 last:border-0">
                    <td className="py-1 pr-3 font-mono text-sena-blue">{r.cedula}</td>
                    <td className="py-1 pr-3 text-sena-gray-dark/60">{r.tipoDocumento}</td>
                    <td className="py-1 pr-3">{r.nombres}</td>
                    <td className="py-1 pr-3">{r.apellidos}</td>
                    <td className="py-1 pr-3 text-sena-gray-dark/50 truncate max-w-[120px]">
                      {r.email ?? "—"}
                    </td>
                    <td className="py-1 text-sena-gray-dark/50 truncate max-w-[120px]">
                      {r.emailPersonal ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 5 && (
              <p className="text-xs text-sena-gray-dark/40 mt-1 text-right">
                y {parsed.length - 5} más…
              </p>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={importing}
            className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2"
          >
            {importing && <Loader2 size={14} className="animate-spin" />}
            {importing ? "Importando..." : `Confirmar importación (${parsed.length} aprendices)`}
          </Button>
        </div>
      )}
    </div>
  );
}
