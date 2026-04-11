"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Pencil, Trash2, ShieldCheck, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

function PasswordStrengthBar({ value }: { value: string }) {
  if (!value) return null;
  const reqs = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const count = reqs.filter(Boolean).length;
  const strength = count === 4 ? "strong" : count >= 3 ? "good" : count >= 2 ? "weak" : "very-weak";
  const reqLabels = [
    { label: "Mínimo 8 caracteres", met: reqs[0] },
    { label: "Una mayúscula", met: reqs[1] },
    { label: "Un número", met: reqs[2] },
    { label: "Un carácter especial", met: reqs[3] },
  ];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-0.5 h-1">
        {[0,1,2,3].map((i) => (
          <div key={i} className={cn("flex-1 rounded-full transition-colors",
            i < count ? strength === "strong" ? "bg-green-500" : strength === "good" ? "bg-amber-500" : "bg-red-400" : "bg-gray-200"
          )} />
        ))}
      </div>
      <p className={cn("text-[10px] font-bold",
        strength === "strong" ? "text-green-600" : strength === "good" ? "text-amber-600" : "text-red-500"
      )}>
        {strength === "strong" ? "Contraseña segura" : strength === "good" ? "Contraseña aceptable" : strength === "weak" ? "Contraseña débil" : "Contraseña muy débil"}
      </p>
      <ul className="space-y-0.5">
        {reqLabels.map((r) => (
          <li key={r.label} className={cn("flex items-center gap-1 text-[10px]", r.met ? "text-green-700" : "text-gray-400")}>
            {r.met ? <Check size={9} className="shrink-0" /> : <X size={9} className="shrink-0" />}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function passwordMeetsRequirements(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

interface Instructor {
  id: string;
  nombre: string;
  email: string;
  isAdmin: boolean;
  creadoEn: string;
  _count: { evaluaciones: number };
}

interface InstructoresTableProps {
  instructores: Instructor[];
  currentInstructorId: string;
  pagination?: { page: number; totalPages: number };
}

export function InstructoresTable({
  instructores,
  currentInstructorId,
  pagination,
}: InstructoresTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", password: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  const openEdit = (instructor: Instructor) => {
    setSaveError(null);
    setEditingInstructor(instructor);
    setEditForm({ nombre: instructor.nombre, email: instructor.email, password: "", confirmPassword: "" });
    setShowEditPassword(false);
    setShowEditConfirm(false);
  };

  const handleEdit = async () => {
    if (!editingInstructor) return;
    setSaveError(null);

    // Validate password if provided
    if (editForm.password.trim()) {
      if (editForm.password !== editForm.confirmPassword) {
        setSaveError("Las contraseñas no coinciden");
        return;
      }
      const passwordReqs = [
        editForm.password.length >= 8,
        /[A-Z]/.test(editForm.password),
        /[0-9]/.test(editForm.password),
        /[^A-Za-z0-9]/.test(editForm.password),
      ];
      if (!passwordReqs.every(Boolean)) {
        setSaveError("La contraseña no cumple los requisitos de seguridad");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, string> = {
        nombre: editForm.nombre,
        email: editForm.email,
      };
      if (editForm.password.trim()) body.password = editForm.password;

      const res = await fetch(`/api/instructor/instructores/${editingInstructor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Error al actualizar");
        return;
      }
      setEditingInstructor(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/instructor/instructores/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  };

  if (instructores.length === 0) {
    return (
      <div className="text-center py-16 text-sena-gray-dark/50">
        <p className="font-semibold">No hay instructores registrados.</p>
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
              <TableHead className="font-bold text-sena-blue">Email</TableHead>
              <TableHead className="font-bold text-sena-blue text-center">Rol</TableHead>
              <TableHead className="font-bold text-sena-blue text-center hidden md:table-cell">
                Evaluaciones
              </TableHead>
              <TableHead className="font-bold text-sena-blue hidden lg:table-cell">
                Registrado
              </TableHead>
              <TableHead className="font-bold text-sena-blue text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instructores.map((instructor) => {
              const isSelf = instructor.id === currentInstructorId;
              const canDelete = !isSelf && !instructor.isAdmin;
              return (
                <TableRow
                  key={instructor.id}
                  className={cn(
                    "transition-colors",
                    deleting === instructor.id && "opacity-40 pointer-events-none",
                    isSelf && "bg-sena-green/5"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sena-blue">{instructor.nombre}</span>
                      {isSelf && (
                        <span className="text-xs text-sena-gray-dark/40">(tú)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-sena-gray-dark/70">{instructor.email}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {instructor.isAdmin ? (
                      <Badge className="bg-sena-blue text-white gap-1">
                        <ShieldCheck size={12} />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-sena-gray-dark/60">
                        Instructor
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <span className="font-bold text-sena-blue">
                      {instructor._count.evaluaciones}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-sena-gray-dark/50">
                      {new Date(instructor.creadoEn).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sena-blue hover:bg-sena-blue/5"
                        onClick={() => openEdit(instructor)}
                      >
                        <Pencil size={15} />
                      </Button>
                      {canDelete ? (
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
                          title="¿Eliminar instructor?"
                          description={`Eliminar a ${instructor.nombre} revocará su acceso al panel. Sus evaluaciones y resultados se conservarán.`}
                          confirmLabel="Sí, eliminar"
                          onConfirm={() => handleDelete(instructor.id)}
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-sena-gray-dark/20 cursor-not-allowed"
                          disabled
                          title={
                            isSelf
                              ? "No puedes eliminarte a ti mismo"
                              : "No se puede eliminar un administrador"
                          }
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href={`?page=${pagination.page - 1}`}
            aria-disabled={pagination.page <= 1}
            className={pagination.page <= 1 ? "pointer-events-none opacity-30" : ""}
          >
            <Button variant="outline" size="sm" disabled={pagination.page <= 1}>
              Anterior
            </Button>
          </Link>
          <span className="text-sm text-sena-gray-dark/60 px-2">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Link
            href={`?page=${pagination.page + 1}`}
            aria-disabled={pagination.page >= pagination.totalPages}
            className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-30" : ""}
          >
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}>
              Siguiente
            </Button>
          </Link>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editingInstructor}
        onOpenChange={(open) => !open && setEditingInstructor(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sena-blue">Editar instructor</DialogTitle>
          </DialogHeader>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="font-semibold text-sena-blue text-xs">
                Nombre completo *
              </Label>
              <Input
                value={editForm.nombre}
                onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="font-semibold text-sena-blue text-xs">
                Correo electrónico *
              </Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="instructor@sena.edu.co"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="font-semibold text-sena-blue text-xs">
                Nueva contraseña{" "}
                <span className="font-normal text-sena-gray-dark/50">
                  (dejar vacío para no cambiar)
                </span>
              </Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowEditPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sena-gray-dark/40 hover:text-sena-gray-dark transition-colors"
                  aria-label={showEditPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrengthBar value={editForm.password} />
            </div>
            {editForm.password.trim() && (
              <div className="grid gap-1.5">
                <Label className="font-semibold text-sena-blue text-xs">
                  Confirmar nueva contraseña *
                </Label>
                <div className="relative">
                  <Input
                    type={showEditConfirm ? "text" : "password"}
                    value={editForm.confirmPassword}
                    onChange={(e) => setEditForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repetí la contraseña"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowEditConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sena-gray-dark/40 hover:text-sena-gray-dark transition-colors"
                    aria-label={showEditConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showEditConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                  <p className="text-[11px] text-red-600">Las contraseñas no coinciden</p>
                )}
                {editForm.confirmPassword && editForm.password === editForm.confirmPassword && (
                  <p className="text-[11px] text-green-600 flex items-center gap-1"><Check size={10} /> Contraseñas coinciden</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingInstructor(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                saving ||
                !editForm.nombre.trim() ||
                !editForm.email.trim() ||
                (editForm.password.trim().length > 0 && (
                  !passwordMeetsRequirements(editForm.password) ||
                  editForm.password !== editForm.confirmPassword
                ))
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
