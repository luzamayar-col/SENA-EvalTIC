"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, ShieldCheck, User, Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial");

const schema = z
  .object({
    nombre: z.string().min(4, "El nombre debe tener al menos 4 caracteres"),
    email: z.string().email("Ingresa un email válido"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme la contraseña"),
    isAdmin: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function PasswordRequirements({ value }: { value: string }) {
  const reqs = [
    { label: "Mínimo 8 caracteres", met: value.length >= 8 },
    { label: "Al menos una mayúscula (A-Z)", met: /[A-Z]/.test(value) },
    { label: "Al menos un número (0-9)", met: /[0-9]/.test(value) },
    { label: "Al menos un carácter especial (!@#$...)", met: /[^A-Za-z0-9]/.test(value) },
  ];
  const metCount = reqs.filter((r) => r.met).length;
  const strength = metCount === 4 ? "strong" : metCount >= 3 ? "good" : metCount >= 2 ? "weak" : "very-weak";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              i < metCount
                ? strength === "strong"
                  ? "bg-green-500"
                  : strength === "good"
                  ? "bg-amber-500"
                  : "bg-red-400"
                : "bg-sena-gray-dark/10"
            )}
          />
        ))}
      </div>
      <p className={cn(
        "text-[10px] font-bold",
        strength === "strong" ? "text-green-600" : strength === "good" ? "text-amber-600" : "text-red-500"
      )}>
        {strength === "strong" ? "Contraseña segura" : strength === "good" ? "Contraseña aceptable" : strength === "weak" ? "Contraseña débil" : "Contraseña muy débil"}
      </p>
      <ul className="space-y-0.5">
        {reqs.map((r) => (
          <li key={r.label} className={cn("flex items-center gap-1.5 text-[11px]", r.met ? "text-green-700" : "text-sena-gray-dark/50")}>
            {r.met ? <Check size={10} className="shrink-0" /> : <X size={10} className="shrink-0" />}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NuevoInstructorForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", email: "", password: "", confirmPassword: "", isAdmin: false },
  });

  const passwordValue = form.watch("password");

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/instructor/instructores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: values.nombre,
          email: values.email,
          password: values.password,
          isAdmin: values.isAdmin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al crear el instructor");
      }

      router.push("/instructor/instructores");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-sm border-sena-gray-dark/10">
      <CardContent className="pt-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">
                    Nombre completo *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre y apellidos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">
                    Correo electrónico *
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@sena.edu.co" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contraseña */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">
                    Contraseña *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sena-gray-dark/40 hover:text-sena-gray-dark transition-colors"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {passwordValue.length > 0 && (
                    <PasswordRequirements value={passwordValue} />
                  )}
                </FormItem>
              )}
            />

            {/* Confirmar contraseña */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">
                    Confirmar contraseña *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repita la contraseña"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sena-gray-dark/40 hover:text-sena-gray-dark transition-colors"
                        aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rol */}
            <FormField
              control={form.control}
              name="isAdmin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">Rol *</FormLabel>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => field.onChange(false)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        !field.value
                          ? "border-sena-green bg-sena-green/5 text-sena-green"
                          : "border-sena-gray-dark/15 text-sena-gray-dark/50 hover:border-sena-gray-dark/30"
                      }`}
                    >
                      <User size={18} className="shrink-0" />
                      <div>
                        <p className="text-sm font-bold leading-tight">Instructor</p>
                        <p className="text-[11px] opacity-70">Gestiona sus evaluaciones</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange(true)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        field.value
                          ? "border-sena-blue bg-sena-blue/5 text-sena-blue"
                          : "border-sena-gray-dark/15 text-sena-gray-dark/50 hover:border-sena-gray-dark/30"
                      }`}
                    >
                      <ShieldCheck size={18} className="shrink-0" />
                      <div>
                        <p className="text-sm font-bold leading-tight">Administrador</p>
                        <p className="text-[11px] opacity-70">Acceso total al sistema</p>
                      </div>
                    </button>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/instructor/instructores")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2 shadow-sm"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? "Guardando..." : "Crear Instructor"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
