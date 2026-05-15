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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JsonUploader } from "@/components/molecules/JsonUploader";
import { Loader2, Save, BookOpen, Settings, CalendarDays, FileQuestion, Clock, Target, RefreshCw, CheckSquare, AlignLeft, Shuffle, ShieldAlert } from "lucide-react";
import { utcToLocalInput, localInputToISO } from "@/lib/effective-dates";

const evaluacionSchema = z.object({
  nombre: z.string().min(4, "El nombre debe tener al menos 4 caracteres"),
  descripcion: z.string().optional(),
  competencia: z.string().min(4, "Ingresa el nombre de la competencia"),
  codigoCompetencia: z.string().min(2, "Ingresa el código de competencia"),
  resultadoAprendizaje: z.string().min(4, "Ingresa el resultado de aprendizaje"),
  codigoRA: z.string().min(2, "Ingresa el código del resultado de aprendizaje"),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  timeLimitMinutes: z.number().min(1, "Mínimo 1 minuto").max(120, "Máximo 120 minutos"),
  passingScorePercentage: z.number().min(1).max(100),
  maxIntentos: z.number().min(1, "Mínimo 1 intento").max(10, "Máximo 10 intentos"),
  seleccion_unica: z.number().min(0),
  seleccion_multiple: z.number().min(0),
  emparejamiento: z.number().min(0),
  umbralMedio: z.number().int().min(1, "Mínimo 1").max(20, "Máximo 20"),
  umbralAlto: z.number().int().min(2, "Mínimo 2").max(50, "Máximo 50"),
}).refine((d) => d.umbralAlto > d.umbralMedio, {
  message: "El umbral alto debe ser mayor que el umbral medio",
  path: ["umbralAlto"],
});

type EvaluacionFormValues = z.infer<typeof evaluacionSchema>;

interface EvaluacionFormTemplateProps {
  mode: "create" | "edit";
  evaluacionId?: string;
  defaultValues?: Partial<EvaluacionFormValues>;
  defaultPreguntas?: unknown[];
}

export function EvaluacionFormTemplate({
  mode,
  evaluacionId,
  defaultValues,
  defaultPreguntas,
}: EvaluacionFormTemplateProps) {
  const router = useRouter();
  const [preguntas, setPreguntas] = useState<unknown[]>(defaultPreguntas ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EvaluacionFormValues>({
    resolver: zodResolver(evaluacionSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      competencia: "ORIENTAR INVESTIGACIÓN FORMATIVA SEGÚN REFERENTES TÉCNICOS",
      codigoCompetencia: "38199",
      resultadoAprendizaje: "PROPONER SOLUCIONES A LAS NECESIDADES DEL CONTEXTO SEGÚN RESULTADOS DE LA INVESTIGACIÓN",
      codigoRA: "580873",
      timeLimitMinutes: 15,
      passingScorePercentage: 65,
      maxIntentos: 1,
      seleccion_unica: 5,
      seleccion_multiple: 3,
      emparejamiento: 2,
      umbralMedio: 2,
      umbralAlto: 3,
      ...(defaultValues ? (({ fechaInicio, fechaFin, ...rest }) => rest)(defaultValues) : {}),
      fechaInicio: utcToLocalInput(defaultValues?.fechaInicio),
      fechaFin: utcToLocalInput(defaultValues?.fechaFin),
    },
  });

  const onSubmit = async (values: EvaluacionFormValues) => {
    if (mode === "create" && preguntas.length === 0) {
      setError("Debes cargar el banco de preguntas (archivo JSON) antes de guardar.");
      return;
    }
    setError(null);
    setIsSaving(true);

    const payload = {
      nombre: values.nombre,
      descripcion: values.descripcion || null,
      competencia: values.competencia,
      codigoCompetencia: values.codigoCompetencia,
      resultadoAprendizaje: values.resultadoAprendizaje,
      codigoRA: values.codigoRA,
      preguntas: preguntas.length > 0 ? preguntas : undefined,
      fechaInicio: localInputToISO(values.fechaInicio),
      fechaFin: localInputToISO(values.fechaFin),
      maxIntentos: values.maxIntentos,
      config: {
        timeLimitMinutes: values.timeLimitMinutes,
        passingScorePercentage: values.passingScorePercentage,
        distribucionPreguntas: {
          seleccion_unica: values.seleccion_unica,
          seleccion_multiple: values.seleccion_multiple,
          emparejamiento: values.emparejamiento,
        },
        aleatorizarOpciones: true,
        umbralAntiplagio: {
          medio: values.umbralMedio,
          alto: values.umbralAlto,
        },
      },
    };

    try {
      const res = await fetch(
        mode === "create"
          ? "/api/instructor/evaluaciones"
          : `/api/instructor/evaluaciones/${evaluacionId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar la evaluación");
      }

      router.push("/instructor/evaluaciones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Información general */}
        <Card className="shadow-sm border-sena-gray-dark/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-sena-blue flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-sena-green" />
              Información general
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue">Nombre de la evaluación *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Investigación Formativa — Competencia 38199" {...field} />
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
                  <FormLabel className="font-semibold text-sena-blue">Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción breve de la evaluación (opcional)"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigoCompetencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue">Código competencia *</FormLabel>
                    <FormControl>
                      <Input placeholder="38199" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="competencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue">Nombre competencia *</FormLabel>
                    <FormControl>
                      <Input placeholder="ORIENTAR INVESTIGACIÓN FORMATIVA..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigoRA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue">Código resultado aprendizaje *</FormLabel>
                    <FormControl>
                      <Input placeholder="580873" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resultadoAprendizaje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue">Resultado de aprendizaje *</FormLabel>
                    <FormControl>
                      <Input placeholder="PROPONER SOLUCIONES..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Banco de preguntas */}
        <Card className="shadow-sm border-sena-gray-dark/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-sena-blue flex items-center gap-2 text-base">
              <FileQuestion size={18} className="text-sena-green" />
              Banco de preguntas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {defaultPreguntas && defaultPreguntas.length > 0 && preguntas === defaultPreguntas ? (
              <div className="bg-sena-green/5 border border-sena-green/20 rounded-xl p-4 text-sm">
                <p className="font-semibold text-sena-green">
                  ✓ {defaultPreguntas.length} preguntas cargadas actualmente
                </p>
                <p className="text-sena-gray-dark/60 text-xs mt-1">
                  Sube un nuevo archivo JSON para reemplazar el banco actual.
                </p>
              </div>
            ) : null}
            <div className={defaultPreguntas && defaultPreguntas.length > 0 && preguntas === defaultPreguntas ? "mt-4" : ""}>
              <JsonUploader
                onPreguntasLoad={(p) => setPreguntas(p)}
                onClear={() => setPreguntas(defaultPreguntas ?? [])}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración */}
        <Card className="shadow-sm border-sena-gray-dark/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sena-blue flex items-center gap-2 text-base">
              <Settings size={18} className="text-sena-green" />
              Configuración de la prueba
            </CardTitle>
            <p className="text-xs text-sena-gray-dark/50 mt-0.5">
              Define los parámetros de tiempo, calificación, intentos y distribución de preguntas.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Row 1: Timing + Scoring + Attempts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Tiempo */}
              <FormField
                control={form.control}
                name="timeLimitMinutes"
                render={({ field }) => (
                  <FormItem className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-sena-blue/10 flex items-center justify-center shrink-0">
                        <Clock size={16} className="text-sena-blue" />
                      </div>
                      <FormLabel className="font-bold text-sena-blue text-sm leading-tight">
                        Tiempo límite
                      </FormLabel>
                    </div>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          className="h-10 text-xl font-black text-sena-blue text-center border-sena-blue/20 focus-visible:ring-sena-blue/30 w-20"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <span className="text-sm text-sena-gray-dark/60 font-medium">min</span>
                    </div>
                    <p className="text-[11px] text-sena-gray-dark/50 mt-1.5">Máx. 120 minutos</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* % Aprobación */}
              <FormField
                control={form.control}
                name="passingScorePercentage"
                render={({ field }) => (
                  <FormItem className="bg-green-50/60 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-sena-green/10 flex items-center justify-center shrink-0">
                        <Target size={16} className="text-sena-green" />
                      </div>
                      <FormLabel className="font-bold text-sena-blue text-sm leading-tight">
                        Nota de corte
                      </FormLabel>
                    </div>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          className="h-10 text-xl font-black text-sena-green text-center border-sena-green/20 focus-visible:ring-sena-green/30 w-20"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <span className="text-sm text-sena-gray-dark/60 font-medium">%</span>
                    </div>
                    <p className="text-[11px] text-sena-gray-dark/50 mt-1.5">Mínimo para aprobar</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Máx. intentos */}
              <FormField
                control={form.control}
                name="maxIntentos"
                render={({ field }) => (
                  <FormItem className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <RefreshCw size={16} className="text-amber-600" />
                      </div>
                      <FormLabel className="font-bold text-sena-blue text-sm leading-tight">
                        Máx. intentos
                      </FormLabel>
                    </div>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          className="h-10 text-xl font-black text-amber-600 text-center border-amber-200 focus-visible:ring-amber-300 w-20"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <span className="text-sm text-sena-gray-dark/60 font-medium">
                        {field.value === 1 ? "intento" : "intentos"}
                      </span>
                    </div>
                    <p className="text-[11px] text-sena-gray-dark/50 mt-1.5">Por aprendiz (máx. 10)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Question distribution */}
            <div className="rounded-xl border border-sena-gray-dark/10 bg-sena-gray-light/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shuffle size={15} className="text-sena-blue/60" />
                <p className="text-xs font-bold text-sena-blue uppercase tracking-wide">
                  Distribución de preguntas por evaluación
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Selección única */}
                <FormField
                  control={form.control}
                  name="seleccion_unica"
                  render={({ field }) => (
                    <FormItem className="bg-white rounded-lg border border-sena-blue/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckSquare size={13} className="text-sena-blue shrink-0" />
                        <FormLabel className="text-[11px] font-bold text-sena-blue uppercase tracking-wide">
                          Sel. única
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 text-lg font-black text-sena-blue text-center border-sena-blue/20"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selección múltiple */}
                <FormField
                  control={form.control}
                  name="seleccion_multiple"
                  render={({ field }) => (
                    <FormItem className="bg-white rounded-lg border border-amber-300/40 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlignLeft size={13} className="text-amber-600 shrink-0" />
                        <FormLabel className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                          Sel. múltiple
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 text-lg font-black text-amber-600 text-center border-amber-200"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Emparejamiento */}
                <FormField
                  control={form.control}
                  name="emparejamiento"
                  render={({ field }) => (
                    <FormItem className="bg-white rounded-lg border border-sena-green/30 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shuffle size={13} className="text-sena-green shrink-0" />
                        <FormLabel className="text-[11px] font-bold text-sena-green uppercase tracking-wide">
                          Emparejamiento
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 text-lg font-black text-sena-green text-center border-sena-green/20"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Live total */}
              <div className="mt-3 flex items-center justify-between bg-white rounded-lg border border-sena-gray-dark/10 px-4 py-2">
                <span className="text-xs text-sena-gray-dark/60 font-medium">Total preguntas por evaluación:</span>
                <span className="text-base font-black text-sena-blue">
                  {(form.watch("seleccion_unica") || 0) +
                    (form.watch("seleccion_multiple") || 0) +
                    (form.watch("emparejamiento") || 0)}
                </span>
              </div>
            </div>

            {/* Umbrales antiplagio */}
            <div className="rounded-xl border border-red-100 bg-red-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={15} className="text-red-500/70" />
                <p className="text-xs font-bold text-sena-blue uppercase tracking-wide">
                  Umbrales de alerta antiplagio
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="umbralMedio"
                  render={({ field }) => (
                    <FormItem className="bg-white rounded-lg border border-amber-200 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert size={13} className="text-amber-600 shrink-0" />
                        <FormLabel className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                          Nivel Medio desde
                        </FormLabel>
                      </div>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            className="h-9 text-lg font-black text-amber-600 text-center border-amber-200 w-20"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <span className="text-xs text-sena-gray-dark/60">incidencias</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="umbralAlto"
                  render={({ field }) => (
                    <FormItem className="bg-white rounded-lg border border-red-200 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert size={13} className="text-red-600 shrink-0" />
                        <FormLabel className="text-[11px] font-bold text-red-700 uppercase tracking-wide">
                          Nivel Alto desde
                        </FormLabel>
                      </div>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            max={50}
                            className="h-9 text-lg font-black text-red-600 text-center border-red-200 w-20"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <span className="text-xs text-sena-gray-dark/60">incidencias</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Live preview */}
              {(() => {
                const m = form.watch("umbralMedio") || 3;
                const a = form.watch("umbralAlto") || 5;
                return (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 bg-white rounded-lg border border-sena-gray-dark/10 px-4 py-2 text-[10px] font-bold">
                    <span className="text-sena-gray-dark/50 font-normal text-xs mr-1">Vista previa:</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">Normal (0)</span>
                    <span className="text-sena-gray-dark/30">→</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Bajo (1–{m - 1 >= 1 ? m - 1 : 1})
                    </span>
                    <span className="text-sena-gray-dark/30">→</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Medio ({m}–{a - 1 >= m ? a - 1 : m})
                    </span>
                    <span className="text-sena-gray-dark/30">→</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">Alto ({a}+)</span>
                  </div>
                );
              })()}
            </div>

          </CardContent>
        </Card>

        {/* Vigencia */}
        <Card className="shadow-sm border-sena-gray-dark/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-sena-blue flex items-center gap-2 text-base">
              <CalendarDays size={18} className="text-sena-green" />
              Vigencia (opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sena-blue">Fecha de inicio</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
                    <FormLabel className="font-semibold text-sena-blue">Fecha de cierre</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/instructor/evaluaciones")}
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
            {isSaving
              ? "Guardando..."
              : mode === "create"
              ? "Crear Evaluación"
              : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
