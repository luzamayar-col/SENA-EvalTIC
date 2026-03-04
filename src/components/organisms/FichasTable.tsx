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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import Link from "next/link";
import { Pencil, Trash2, Loader2, ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ficha {
  id: string;
  numero: string;
  programa: string;
  descripcion: string | null;
  activa: boolean;
  creadoEn: string;
  evaluacion: {
    id: string;
    nombre: string;
    activa: boolean;
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  _count?: {
    resultados: number;
    aprendices: number;
  };
}

interface FichasTableProps {
  fichas: Ficha[];
}

type EstadoBadge = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

function getEstado(ficha: Ficha): EstadoBadge {
  if (!ficha.activa) {
    return { label: "Inactiva", variant: "outline", className: "text-sena-gray-dark/50" };
  }
  if (!ficha.evaluacion.activa) {
    return { label: "Eval. inactiva", variant: "outline", className: "text-sena-gray-dark/50" };
  }
  const now = new Date();
  if (ficha.evaluacion.fechaInicio && now < new Date(ficha.evaluacion.fechaInicio)) {
    return { label: "Programada", variant: "outline", className: "border-amber-400 text-amber-600" };
  }
  if (ficha.evaluacion.fechaFin && now > new Date(ficha.evaluacion.fechaFin)) {
    return { label: "Vencida", variant: "destructive" };
  }
  return { label: "Activa", variant: "default", className: "bg-sena-green text-white" };
}

export function FichasTable({ fichas }: FichasTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);
  const [editForm, setEditForm] = useState({
    numero: "",
    programa: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openEdit = (ficha: Ficha) => {
    setSaveError(null);
    setEditingFicha(ficha);
    setEditForm({
      numero: ficha.numero,
      programa: ficha.programa,
      descripcion: ficha.descripcion ?? "",
    });
  };

  const handleToggleActive = async (ficha: Ficha) => {
    setToggling(ficha.id);
    try {
      await fetch(`/api/instructor/fichas/${ficha.id}/toggle-active`, {
        method: "PATCH",
      });
      router.refresh();
    } finally {
      setToggling(null);
    }
  };

  const handleEdit = async () => {
    if (!editingFicha) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/instructor/fichas/${editingFicha.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Error al actualizar");
        return;
      }
      setEditingFicha(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/instructor/fichas/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  };

  if (fichas.length === 0) {
    return (
      <div className="text-center py-16 text-sena-gray-dark/50">
        <p className="font-semibold">No hay fichas registradas.</p>
        <p className="text-sm mt-1">Crea una ficha y asóciala a una evaluación.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-sena-gray-dark/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-sena-gray-light/50 hover:bg-sena-gray-light/50">
              <TableHead className="font-bold text-sena-blue">Número</TableHead>
              <TableHead className="font-bold text-sena-blue">Programa</TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Estado</TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Activa</TableHead>
              <TableHead className="font-bold text-sena-blue hidden md:table-cell">Evaluación</TableHead>
              <TableHead className="font-bold text-sena-blue text-center hidden md:table-cell">Aprendices</TableHead>
              <TableHead className="font-bold text-sena-blue text-center hidden md:table-cell">Resultados</TableHead>
              <TableHead className="font-bold text-sena-blue text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fichas.map((ficha) => {
              const estado = getEstado(ficha);
              return (
                <TableRow
                  key={ficha.id}
                  className={cn(
                    "transition-colors",
                    (deleting === ficha.id || toggling === ficha.id) &&
                      "opacity-40 pointer-events-none"
                  )}
                >
                  <TableCell>
                    <Link
                      href={`/instructor/fichas/${ficha.id}`}
                      className="inline-flex items-center gap-1 font-bold text-sena-blue text-base font-mono hover:underline"
                    >
                      {ficha.numero}
                      <ExternalLink size={11} className="opacity-40" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-sena-gray-dark/80 max-w-[200px] truncate">
                      {ficha.programa}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={estado.variant}
                      className={cn("text-xs", estado.className)}
                    >
                      {estado.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={ficha.activa}
                      onCheckedChange={() => handleToggleActive(ficha)}
                      disabled={toggling === ficha.id}
                      className="data-[state=checked]:bg-sena-green"
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>
                      <p className="text-xs text-sena-gray-dark/60 max-w-[200px] truncate">
                        {ficha.evaluacion.nombre}
                      </p>
                      {(ficha.evaluacion.fechaInicio || ficha.evaluacion.fechaFin) && (
                        <p className="text-xs text-sena-gray-dark/40 mt-0.5">
                          {ficha.evaluacion.fechaInicio
                            ? new Date(ficha.evaluacion.fechaInicio).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                            : "sin inicio"}
                          {" – "}
                          {ficha.evaluacion.fechaFin
                            ? new Date(ficha.evaluacion.fechaFin).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                            : "sin fin"}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <span className="font-bold text-sena-blue">
                      {ficha._count?.aprendices ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <span className="font-bold text-sena-blue">
                      {ficha._count?.resultados ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/instructor/fichas/${ficha.id}`}
                        title="Ver aprendices y resultados"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-sena-green hover:bg-sena-green/5"
                        >
                          <Users size={15} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sena-blue hover:bg-sena-blue/5"
                        onClick={() => openEdit(ficha)}
                      >
                        <Pencil size={15} />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </Button>
                        }
                        title="¿Eliminar ficha?"
                        description={`Eliminar la ficha ${ficha.numero} no eliminará los resultados ya registrados.`}
                        confirmLabel="Sí, eliminar"
                        onConfirm={() => handleDelete(ficha.id)}
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
      <Dialog open={!!editingFicha} onOpenChange={(open) => !open && setEditingFicha(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sena-blue">
              Editar ficha {editingFicha?.numero}
            </DialogTitle>
          </DialogHeader>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="font-semibold text-sena-blue text-xs">
                Número de ficha *
              </Label>
              <Input
                value={editForm.numero}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, numero: e.target.value }))
                }
                placeholder="Ej: 2501234"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="font-semibold text-sena-blue text-xs">
                Programa de formación *
              </Label>
              <Input
                value={editForm.programa}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, programa: e.target.value }))
                }
                placeholder="Ej: Tecnólogo en Redes..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="font-semibold text-sena-blue text-xs">
                Descripción (opcional)
              </Label>
              <Input
                value={editForm.descripcion}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                placeholder="Nota adicional..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingFicha(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                saving ||
                !editForm.numero.trim() ||
                !editForm.programa.trim()
              }
              className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
