"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Pencil, Trash2, Users2, BarChart2, FlaskConical, ListChecks, Loader2, Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEvaluacionStore } from "@/stores/evaluacion-store";

interface Evaluacion {
  id: string;
  nombre: string;
  competencia: string;
  activa: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
  _count: {
    fichas: number;
    resultados: number;
  };
}

interface EvaluacionesTableProps {
  evaluaciones: Evaluacion[];
}

function getEstadoBadge(activa: boolean, fechaInicio: string | null, fechaFin: string | null) {
  const now = new Date();
  if (activa) {
    if (fechaFin && new Date(fechaFin) < now) {
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">Vencida</Badge>;
    }
    return <Badge className="bg-sena-green/10 text-sena-green border-sena-green/30 border font-semibold">Activa</Badge>;
  }
  if (fechaInicio && new Date(fechaInicio) > now) {
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 border">Programada</Badge>;
  }
  return <Badge variant="secondary" className="text-sena-gray-dark/60">Inactiva</Badge>;
}

export function EvaluacionesTable({ evaluaciones }: EvaluacionesTableProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const iniciarEvaluacion = useEvaluacionStore((s) => s.iniciarEvaluacion);

  // Notificación por evaluación
  const [notificarEvalId, setNotificarEvalId] = useState<string | null>(null);
  const [notificarMensaje, setNotificarMensaje] = useState("");
  const [notificando, setNotificando] = useState(false);
  const [notificarResult, setNotificarResult] = useState<{ enviados: number; sinEmail: number; fichas: number } | null>(null);
  const [notificarError, setNotificarError] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    setToggling(id);
    await fetch(`/api/instructor/evaluaciones/${id}/toggle-active`, { method: "PATCH" });
    router.refresh();
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/instructor/evaluaciones/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  };

  const handleNotificar = async () => {
    if (!notificarEvalId) return;
    setNotificando(true);
    setNotificarError(null);
    try {
      const res = await fetch(`/api/instructor/evaluaciones/${notificarEvalId}/notificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: notificarMensaje.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotificarError(data.error ?? "No se pudo enviar la notificación");
      } else {
        setNotificarResult(data);
      }
    } catch {
      setNotificarError("Error de red. Intenta nuevamente.");
    } finally {
      setNotificando(false);
    }
  };

  const handleProbar = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/instructor/evaluaciones/${id}/prueba`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "No se pudo iniciar el modo prueba");
        return;
      }
      const data = await res.json();
      iniciarEvaluacion(
        data.preguntas,
        data.tiempoLimite,
        null,
        data.evaluacionId,
        data.intentoNumero,
        data.aprendizInfo,
        true,
        data.umbralAntiplagio ?? null,
      );
      router.push("/evaluacion");
    } finally {
      setTesting(null);
    }
  };

  if (evaluaciones.length === 0) {
    return (
      <div className="text-center py-16 text-sena-gray-dark/50">
        <p className="font-semibold">No hay evaluaciones registradas.</p>
        <p className="text-sm mt-1">Crea la primera usando el botón "Nueva Evaluación".</p>
      </div>
    );
  }

  return (
    <>
    <div className="rounded-xl border border-sena-gray-dark/10 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-sena-gray-light/50 hover:bg-sena-gray-light/50">
            <TableHead className="font-bold text-sena-blue">Nombre</TableHead>
            <TableHead className="font-bold text-sena-blue hidden lg:table-cell">Competencia</TableHead>
            <TableHead className="font-bold text-sena-blue text-center">Fichas</TableHead>
            <TableHead className="font-bold text-sena-blue text-center">Resultados</TableHead>
            <TableHead className="font-bold text-sena-blue">Estado</TableHead>
            <TableHead className="font-bold text-sena-blue text-center">Activa</TableHead>
            <TableHead className="font-bold text-sena-blue text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {evaluaciones.map((ev) => (
            <TableRow
              key={ev.id}
              className={cn(
                "transition-colors",
                deleting === ev.id && "opacity-40 pointer-events-none"
              )}
            >
              <TableCell>
                <div>
                  <p className="font-semibold text-sena-blue text-sm">{ev.nombre}</p>
                  {(ev.fechaInicio || ev.fechaFin) && (
                    <p className="text-[11px] text-sena-gray-dark/50 mt-0.5">
                      {ev.fechaInicio
                        ? new Date(ev.fechaInicio).toLocaleDateString("es-CO")
                        : "—"}
                      {" → "}
                      {ev.fechaFin
                        ? new Date(ev.fechaFin).toLocaleDateString("es-CO")
                        : "Sin vencimiento"}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <p className="text-xs text-sena-gray-dark/70 max-w-[220px] truncate">
                  {ev.competencia}
                </p>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-sena-blue">
                  <Users2 size={14} className="text-sena-green" />
                  {ev._count.fichas}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-sena-blue">
                  <BarChart2 size={14} className="text-sena-green" />
                  {ev._count.resultados}
                </span>
              </TableCell>
              <TableCell>
                {getEstadoBadge(ev.activa, ev.fechaInicio, ev.fechaFin)}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={ev.activa}
                  disabled={toggling === ev.id}
                  onCheckedChange={() => handleToggle(ev.id)}
                  title={ev.activa ? "Desactivar evaluación" : "Activar evaluación"}
                  className="data-[state=checked]:bg-sena-green"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {/* Notificar aprendices */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-sena-blue hover:bg-sena-blue/10"
                    title="Notificar aprendices"
                    onClick={() => {
                      setNotificarEvalId(ev.id);
                      setNotificarMensaje("");
                      setNotificarResult(null);
                      setNotificarError(null);
                    }}
                  >
                    <Bell size={14} />
                  </Button>
                  {/* Test mode */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                    title="Probar evaluación"
                    onClick={() => handleProbar(ev.id)}
                    disabled={testing === ev.id}
                  >
                    {testing === ev.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <FlaskConical size={14} />
                    }
                  </Button>
                  {/* Edit questions */}
                  <Link href={`/instructor/evaluaciones/${ev.id}/preguntas`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sena-green hover:bg-sena-green/5" title="Editar preguntas">
                      <ListChecks size={15} />
                    </Button>
                  </Link>
                  {/* Edit evaluation */}
                  <Link href={`/instructor/evaluaciones/${ev.id}`} title="Editar evaluación">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sena-blue hover:bg-sena-blue/10">
                      <Pencil size={15} />
                    </Button>
                  </Link>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" title="Eliminar evaluación" className="h-8 w-8 text-red-500 hover:bg-red-50">
                        <Trash2 size={15} />
                      </Button>
                    }
                    title="¿Eliminar evaluación?"
                    description={`Esta acción eliminará "${ev.nombre}" y todas sus fichas y resultados asociados. No se puede deshacer.`}
                    confirmLabel="Sí, eliminar"
                    onConfirm={() => handleDelete(ev.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

      {/* Dialog — notificar aprendices de la evaluación */}
      <Dialog
        open={!!notificarEvalId}
        onOpenChange={(open) => { if (!open) setNotificarEvalId(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sena-blue flex items-center gap-2">
              <Bell size={16} /> Notificar aprendices
            </DialogTitle>
          </DialogHeader>

          {notificarResult ? (
            <div className="space-y-3 py-2">
              <div className="bg-sena-green/5 border border-sena-green/20 rounded-md px-4 py-3 text-sm text-sena-blue">
                <p className="font-semibold">Notificación enviada</p>
                <p className="mt-1">
                  Se notificaron <strong>{notificarResult.enviados}</strong> aprendice{notificarResult.enviados !== 1 ? "s" : ""} en <strong>{notificarResult.fichas}</strong> ficha{notificarResult.fichas !== 1 ? "s" : ""}.
                  {notificarResult.sinEmail > 0 && (
                    <> {notificarResult.sinEmail} aprendice{notificarResult.sinEmail !== 1 ? "s" : ""} no tiene{notificarResult.sinEmail !== 1 ? "n" : ""} correo personal registrado.</>
                  )}
                </p>
              </div>
              <Button className="w-full bg-sena-blue hover:bg-sena-blue/90" onClick={() => setNotificarEvalId(null)}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-sena-gray-dark/70">
                Se enviará un correo de convocatoria a todos los aprendices con correo personal registrado en todas las fichas de esta evaluación.
              </p>
              {notificarError && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
                  {notificarError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notif-eval-msg" className="text-sm font-medium">
                  Mensaje adicional <span className="text-sena-gray-dark/40 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="notif-eval-msg"
                  value={notificarMensaje}
                  onChange={(e) => setNotificarMensaje(e.target.value)}
                  placeholder="Ej: Recuerden ingresar el martes a partir de las 8am..."
                  className="resize-none text-sm"
                  rows={3}
                  maxLength={2000}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setNotificarEvalId(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-sena-blue hover:bg-sena-blue/90 gap-1.5"
                  onClick={handleNotificar}
                  disabled={notificando}
                >
                  {notificando ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  {notificando ? "Enviando..." : "Enviar notificación"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
