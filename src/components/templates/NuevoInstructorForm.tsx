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
import { Loader2, Save, ShieldCheck, User } from "lucide-react";

const schema = z.object({
  nombre: z.string().min(4, "El nombre debe tener al menos 4 caracteres"),
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  isAdmin: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function NuevoInstructorForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", email: "", password: "", isAdmin: false },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/instructor/instructores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">
                    Contraseña *
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
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
