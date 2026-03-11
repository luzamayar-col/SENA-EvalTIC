"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { ResultadoBadge } from "@/components/molecules/ResultadoBadge";
import { Pencil, Trash2, Loader2, PlusCircle, Eraser, FileDown, ShieldAlert } from "lucide-react";
import { generatePDF, savePdf } from "@/lib/pdf-generator";
import { calcularPuntaje } from "@/lib/score";
import { DatosAprendiz, RespuestaAprendiz } from "@/stores/evaluacion-store";
import { cn, fmtScore } from "@/lib/utils";

export interface AprendizRow {
  id: string;
  cedula: string;
  tipoDocumento: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  emailPersonal: string | null;
  intentosExtra: number;
  intentosUsados: number;
  intentosPermitidos: number;
  ultimoResultado: {
    id: string;
    intento: number;
    puntaje: number;
    aprobado: boolean;
    presentadoEn: string;
    incidenciasAntiplagio: number;
  } | null;
}

interface AprendicesTableProps {
  aprendices: AprendizRow[];
  evaluacionMaxIntentos: number;
  fichaId: string;
  fichaNumero: string;
  fichaPrograma: string;
  umbralAntiplagio?: { medio: number; alto: number };
}

export function AprendicesTable({
  aprendices,
  evaluacionMaxIntentos,
  fichaId,
  fichaNumero,
  fichaPrograma,
  umbralAntiplagio,
}: AprendicesTableProps) {
  const umbralMedio = umbralAntiplagio?.medio ?? 3;
  const umbralAlto = umbralAntiplagio?.alto ?? 5;
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [editingAprendiz, setEditingAprendiz] = useState<AprendizRow | null>(null);
  const [editForm, setEditForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    emailPersonal: "",
    tipoDocumento: "CC",
    intentosExtra: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // ── Add single aprendiz ──────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    cedula: "", tipoDocumento: "CC", nombres: "", apellidos: "", email: "", emailPersonal: "",
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const openEdit = (a: AprendizRow) => {
    setSaveError(null);
    setEditingAprendiz(a);
    setEditForm({
      nombres: a.nombres,
      apellidos: a.apellidos,
      email: a.email ?? "",
      emailPersonal: a.emailPersonal ?? "",
      tipoDocumento: a.tipoDocumento,
      intentosExtra: a.intentosExtra,
    });
  };

  const handleEdit = async () => {
    if (!editingAprendiz) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/instructor/aprendices/${editingAprendiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Error al actualizar");
        return;
      }
      setEditingAprendiz(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleGrantAttempt = async (a: AprendizRow) => {
    setGrantingId(a.id);
    try {
      await fetch(`/api/instructor/aprendices/${a.id}/intentos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentosExtra: a.intentosExtra + 1 }),
      });
      router.refresh();
    } finally {
      setGrantingId(null);
    }
  };

  const handleDelete = async (a: AprendizRow) => {
    setDeleting(a.id);
    const res = await fetch(`/api/instructor/aprendices/${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "No se pudo eliminar");
    } else {
      router.refresh();
    }
    setDeleting(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    await fetch(`/api/instructor/fichas/${fichaId}/aprendices`, { method: "DELETE" });
    router.refresh();
    setDeletingAll(false);
  };

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/instructor/fichas/${fichaId}/aprendices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const d = await res.json();
        setAddError(d.error ?? "Error al agregar");
        return;
      }
      setAddOpen(false);
      setAddForm({ cedula: "", tipoDocumento: "CC", nombres: "", apellidos: "", email: "", emailPersonal: "" });
      router.refresh();
    } finally {
      setAdding(false);
    }
  };

  const handleDownloadPDF = async (a: AprendizRow) => {
    if (!a.ultimoResultado?.id) return;
    setDownloadingPdfId(a.id);
    try {
      const res = await fetch(`/api/instructor/resultados/${a.ultimoResultado.id}/pdf-data`);
      if (!res.ok) {
        alert("No se pudo obtener los datos del informe");
        return;
      }
      const { resultado, preguntas, passingScore, umbralAntiplagio: umbral } = await res.json();
      const datosAprendiz: DatosAprendiz = {
        nombres: resultado.nombres,
        apellidos: resultado.apellidos,
        tipoDocumento: resultado.tipoDocumento,
        numeroDocumento: resultado.cedula,
        correo: resultado.email,
        ficha: fichaNumero,
        programaFormacion: fichaPrograma,
      };
      const respuestas = resultado.respuestas as Record<string, RespuestaAprendiz>;
      const evaluacionResultado = calcularPuntaje(preguntas, respuestas, passingScore);
      const bytes = await generatePDF(datosAprendiz, evaluacionResultado, resultado.tiempoUsado, preguntas, respuestas, resultado.incidenciasAntiplagio, umbral);
      const fileName = `Evaluacion_${resultado.nombres.replace(/\s+/g, "")}_${resultado.cedula}_I${resultado.intento}.pdf`;
      savePdf(bytes, fileName);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  if (aprendices.length === 0 && !addOpen) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="bg-sena-green hover:bg-sena-green-dark text-white gap-1"
          >
            <PlusCircle size={14} /> Agregar aprendiz
          </Button>
        </div>
        <div className="text-center py-12 text-sena-gray-dark/50">
          <p className="font-semibold">No hay aprendices registrados.</p>
          <p className="text-sm mt-1">Importa un listado Excel o agrega aprendices manualmente.</p>
        </div>
        <AddDialog open={addOpen} onClose={() => setAddOpen(false)} form={addForm}
          setForm={setAddForm} onAdd={handleAdd} adding={adding} addError={addError} />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              size="sm"
              disabled={deletingAll}
              className="gap-1.5 border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              {deletingAll ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
              Eliminar todos
            </Button>
          }
          title="¿Eliminar todos los aprendices?"
          description={`Se eliminarán los ${aprendices.length} aprendices de esta ficha. Los resultados ya registrados no se perderán.`}
          confirmLabel="Sí, eliminar todos"
          onConfirm={handleDeleteAll}
        />
        <Button
          onClick={() => setAddOpen(true)}
          size="sm"
          className="bg-sena-green hover:bg-sena-green-dark text-white gap-1"
        >
          <PlusCircle size={14} /> Agregar aprendiz
        </Button>
      </div>

      <div className="rounded-xl border border-sena-gray-dark/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-sena-gray-light/50 hover:bg-sena-gray-light/50">
              <TableHead className="font-bold text-sena-blue w-10 text-center">#</TableHead>
              <TableHead className="font-bold text-sena-blue">Cédula</TableHead>
              <TableHead className="font-bold text-sena-blue">Nombre</TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Intentos</TableHead>
              <TableHead className="font-bold text-sena-blue hidden md:table-cell">Último resultado</TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Integridad</TableHead>
              <TableHead className="font-bold text-sena-blue text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aprendices.map((a, idx) => {
              const intentosAgotados = a.intentosUsados >= a.intentosPermitidos;
              return (
                <TableRow
                  key={a.id}
                  className={cn(
                    "transition-colors",
                    (deleting === a.id || grantingId === a.id) && "opacity-40 pointer-events-none"
                  )}
                >
                  <TableCell className="text-center text-xs text-sena-gray-dark/40 font-mono">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono font-semibold text-sena-blue">{a.cedula}</p>
                    <p className="text-xs text-sena-gray-dark/50">{a.tipoDocumento}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sena-gray-dark/90">
                      {a.nombres} {a.apellidos}
                    </p>
                    {a.email && (
                      <p className="text-xs text-sena-gray-dark/50 truncate max-w-[200px]" title={a.email}>
                        🏫 {a.email}
                      </p>
                    )}
                    {a.emailPersonal && (
                      <p className="text-xs text-sena-gray-dark/40 truncate max-w-[200px]" title={a.emailPersonal}>
                        📧 {a.emailPersonal}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={intentosAgotados ? "destructive" : "outline"}
                      className={cn(
                        "text-xs font-semibold",
                        !intentosAgotados && "border-sena-green text-sena-green"
                      )}
                    >
                      {a.intentosUsados}/{a.intentosPermitidos}
                    </Badge>
                    {a.intentosExtra > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">+{a.intentosExtra} extra</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {a.ultimoResultado ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sena-blue text-sm">
                          {fmtScore(a.ultimoResultado.puntaje)}%
                        </span>
                        <ResultadoBadge aprobado={a.ultimoResultado.aprobado} />
                        <span className="text-xs text-sena-gray-dark/40">
                          {new Date(a.ultimoResultado.presentadoEn).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-sena-gray-dark/40">Sin presentar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {!a.ultimoResultado ? (
                      <span className="text-xs text-sena-gray-dark/30">—</span>
                    ) : (() => {
                      const n = a.ultimoResultado.incidenciasAntiplagio;
                      if (n === 0) return <span className="text-xs text-green-700 font-medium">Normal</span>;
                      const cls = n < umbralMedio
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : n < umbralAlto
                        ? "bg-orange-100 text-orange-700 border-orange-200"
                        : "bg-red-100 text-red-700 border-red-200";
                      const label = n < umbralMedio ? "Bajo" : n < umbralAlto ? "Medio" : "Alto";
                      return (
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border", cls)}>
                          <ShieldAlert size={9} />
                          {label} · {n}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.ultimoResultado && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Descargar informe PDF (último intento)"
                          className="h-8 w-8 text-sena-green hover:bg-sena-green/10"
                          onClick={() => handleDownloadPDF(a)}
                          disabled={downloadingPdfId === a.id}
                        >
                          {downloadingPdfId === a.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <FileDown size={14} />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Conceder +1 intento"
                        className="h-8 px-2 text-amber-600 hover:bg-amber-50 text-xs"
                        onClick={() => handleGrantAttempt(a)}
                        disabled={grantingId === a.id}
                      >
                        {grantingId === a.id ? <Loader2 size={12} className="animate-spin" /> : "+1"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar aprendiz"
                        className="h-8 w-8 text-sena-blue hover:bg-sena-blue/5"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            disabled={a.intentosUsados > 0}
                            title={a.intentosUsados > 0 ? "Tiene resultados registrados" : "Eliminar"}
                          >
                            <Trash2 size={14} />
                          </Button>
                        }
                        title="¿Eliminar aprendiz?"
                        description={`Eliminar a ${a.nombres} ${a.apellidos} (${a.cedula}) de esta ficha.`}
                        confirmLabel="Sí, eliminar"
                        onConfirm={() => handleDelete(a)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingAprendiz} onOpenChange={(open) => !open && setEditingAprendiz(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sena-blue">
              Editar aprendiz — {editingAprendiz?.cedula}
            </DialogTitle>
          </DialogHeader>
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-sena-blue">Nombres *</Label>
                <Input value={editForm.nombres}
                  onChange={(e) => setEditForm((f) => ({ ...f, nombres: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-sena-blue">Apellidos *</Label>
                <Input value={editForm.apellidos}
                  onChange={(e) => setEditForm((f) => ({ ...f, apellidos: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">Correo institucional (opcional)</Label>
              <Input type="email" value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nombre@soy.sena.edu.co" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">Correo personal (opcional)</Label>
              <Input type="email" value={editForm.emailPersonal}
                onChange={(e) => setEditForm((f) => ({ ...f, emailPersonal: e.target.value }))}
                placeholder="correo@gmail.com" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">
                Intentos extra (sobre el máximo de la evaluación = {evaluacionMaxIntentos})
              </Label>
              <Input
                type="number" min={0} max={20}
                value={editForm.intentosExtra}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, intentosExtra: e.target.valueAsNumber || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAprendiz(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !editForm.nombres.trim() || !editForm.apellidos.trim()}
              className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} form={addForm}
        setForm={setAddForm} onAdd={handleAdd} adding={adding} addError={addError} />
    </>
  );
}

// ── Internal AddDialog component ──────────────────────────────────────────────

function AddDialog({
  open, onClose, form, setForm, onAdd, adding, addError,
}: {
  open: boolean;
  onClose: () => void;
  form: { cedula: string; tipoDocumento: string; nombres: string; apellidos: string; email: string; emailPersonal: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onAdd: () => void;
  adding: boolean;
  addError: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sena-blue">Agregar aprendiz</DialogTitle>
        </DialogHeader>
        {addError && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
            {addError}
          </div>
        )}
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">Tipo Doc</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.tipoDocumento}
                onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PEP">PEP</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">Cédula *</Label>
              <Input value={form.cedula}
                onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                placeholder="1020304050" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">Nombres *</Label>
              <Input value={form.nombres}
                onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-sena-blue">Apellidos *</Label>
              <Input value={form.apellidos}
                onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-sena-blue">Correo institucional (opcional)</Label>
            <Input type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="nombre@soy.sena.edu.co" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-sena-blue">Correo personal (opcional)</Label>
            <Input type="email" value={form.emailPersonal}
              onChange={(e) => setForm((f) => ({ ...f, emailPersonal: e.target.value }))}
              placeholder="correo@gmail.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={adding}>Cancelar</Button>
          <Button
            onClick={onAdd}
            disabled={adding || !form.cedula.trim() || !form.nombres.trim() || !form.apellidos.trim()}
            className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2"
          >
            {adding && <Loader2 size={14} className="animate-spin" />}
            {adding ? "Agregando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
