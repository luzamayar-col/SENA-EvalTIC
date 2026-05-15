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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle } from "lucide-react";

const fichaSchema = z
  .object({
    numero: z.string().min(4, "El número de ficha debe tener al menos 4 caracteres"),
    programa: z.string().min(4, "Ingresa el nombre del programa"),
    descripcion: z.string().optional(),
    evaluacionId: z.string().min(1, "Selecciona una evaluación"),
    fechaInicio: z.string().optional().nullable(),
    fechaFin: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.fechaInicio && data.fechaFin) {
        return new Date(data.fechaFin) >= new Date(data.fechaInicio);
      }
      return true;
    },
    { message: "La fecha de fin debe ser igual o posterior a la de inicio", path: ["fechaFin"] },
  );

type FichaFormValues = z.infer<typeof fichaSchema>;

interface Evaluacion {
  id: string;
  nombre: string;
}

interface FichaFormInlineProps {
  evaluaciones: Evaluacion[];
}

export function FichaFormInline({ evaluaciones }: FichaFormInlineProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FichaFormValues>({
    resolver: zodResolver(fichaSchema),
    defaultValues: {
      numero: "",
      programa: "",
      descripcion: "",
      evaluacionId: "",
      fechaInicio: "",
      fechaFin: "",
    },
  });

  const onSubmit = async (values: FichaFormValues) => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const res = await fetch("/api/instructor/fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al crear la ficha");
      }

      form.reset();
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-sm border-sena-gray-dark/10">
      <CardHeader className="pb-4">
        <CardTitle className="text-sena-blue flex items-center gap-2 text-base">
          <PlusCircle size={18} className="text-sena-green" />
          Registrar nueva ficha
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-sena-green/5 border border-sena-green/20 rounded-lg p-3 text-sm text-sena-green font-semibold">
            ✓ Ficha creada exitosamente
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue text-xs">
                      Número de ficha *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 2501234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="evaluacionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue text-xs">
                      Evaluación *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {evaluaciones.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id}>
                            {ev.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="programa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue text-xs">
                      Programa de formación *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Tecnólogo en Redes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue text-xs">
                      Descripción (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nota adicional..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fechas opcionales por ficha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue text-xs">
                      Inicio de vigencia (opcional — sobreescribe evaluación)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue text-xs">
                      Fin de vigencia (opcional — sobreescribe evaluación)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || evaluaciones.length === 0}
                className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2 shadow-sm"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <PlusCircle size={16} />
                )}
                {isSaving ? "Guardando..." : "Crear ficha"}
              </Button>
            </div>
            {evaluaciones.length === 0 && (
              <p className="mt-2 text-xs text-amber-600 text-right">
                Crea al menos una evaluación antes de registrar fichas.
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
