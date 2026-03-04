"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEvaluacionStore } from "@/stores/evaluacion-store";
import { APP_CONFIG } from "@/lib/config";
import { calcularPuntaje } from "@/lib/score";
import { generatePDF } from "@/lib/pdf-generator";
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  User,
  Clock,
  FileText,
  FileDown,
} from "lucide-react";

interface FichaOption {
  numero: string;
  programa: string;
}

interface FormularioRegistroProps {
  fichas?: FichaOption[];
}

type Step = "lookup" | "found" | "not_found" | "starting";

interface AprendizEncontrado {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  email: string | null;
  intentosUsados: number;
  intentosPermitidos: number;
  puedeIniciar: boolean;
  ultimoResultadoId: string | null;
  tiempoLimiteMinutos: number | null;
  totalPreguntas: number | null;
  ficha: {
    id: string;
    numero: string;
    programa: string;
    evaluacion: {
      nombre: string;
      competencia: string;
      resultadoAprendizaje: string;
    };
  };
}

export function FormularioRegistro({ fichas = [] }: FormularioRegistroProps) {
  const router = useRouter();
  const hasDbFichas = fichas.length > 0;

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("lookup");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState("");
  const [cedula, setCedula] = useState("");
  const [aprendiz, setAprendiz] = useState<AprendizEncontrado | null>(null);
  const [email, setEmail] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const iniciarEvaluacion = useEvaluacionStore((s) => s.iniciarEvaluacion);
  const setDatosAprendiz = useEvaluacionStore((s) => s.setDatosAprendiz);

  // ── Legacy (no DB fichas) ─ single-step form ───────────────────────────────
  if (!hasDbFichas && !APP_CONFIG.useDatabaseBackend) {
    return <LegacyForm fichas={fichas} />;
  }

  // ── Step 1: Lookup ─────────────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!fichaSeleccionada || !cedula.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/evaluacion/validar-aprendiz?cedula=${encodeURIComponent(cedula.trim())}&ficha=${encodeURIComponent(fichaSeleccionada)}`
      );
      const data = await res.json();

      if (!data.encontrado) {
        setLookupError(data.error ?? "No se encontró el registro");
        setStep("not_found");
        return;
      }

      setAprendiz(data);
      setEmail(data.email ?? "");
      setStep("found");
    } catch {
      setLookupError("Error de conexión. Intenta de nuevo.");
      setStep("not_found");
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Step 2: Confirm + Start ────────────────────────────────────────────────
  const handleStart = async () => {
    if (!aprendiz) return;
    setStep("starting");
    setStartError(null);

    try {
      const res = await fetch("/api/evaluacion/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedula.trim(),
          ficha: fichaSeleccionada,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStartError(data.error ?? "Error al iniciar la evaluación");
        setStep("found");
        return;
      }

      if (data.yaPresento) {
        setStartError(
          `Has usado todos tus intentos (${data.intentosUsados}/${data.intentosPermitidos}). Contacta a tu instructor para obtener una nueva oportunidad.`
        );
        setStep("found");
        return;
      }

      // Poblar el store con datos del aprendiz
      setDatosAprendiz({
        nombres: aprendiz.nombres,
        apellidos: aprendiz.apellidos,
        tipoDocumento: aprendiz.tipoDocumento,
        numeroDocumento: cedula.trim(),
        correo: email.trim(),
        ficha: fichaSeleccionada,
        programaFormacion: aprendiz.ficha.programa,
      });

      iniciarEvaluacion(
        data.preguntas,
        data.tiempoLimite,
        data.fichaId ?? null,
        data.evaluacionId ?? null,
        data.intentoNumero ?? null,
        data.aprendizInfo ?? null,
        false
      );

      router.push("/evaluacion");
    } catch {
      setStartError("Error de conexión al iniciar la evaluación.");
      setStep("found");
    }
  };

  // ── Download last-attempt PDF (public) ────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!aprendiz?.ultimoResultadoId) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(
        `/api/evaluacion/pdf-resultado/${aprendiz.ultimoResultadoId}?cedula=${encodeURIComponent(cedula.trim())}`,
      );
      if (!res.ok) return;
      const { resultado, preguntas, passingScore } = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const respuestas = resultado.respuestas as Record<string, any>;
      const evaluacionResultado = calcularPuntaje(preguntas, respuestas, passingScore);

      const doc = await generatePDF(
        {
          nombres: resultado.nombres,
          apellidos: resultado.apellidos,
          tipoDocumento: resultado.tipoDocumento,
          numeroDocumento: resultado.cedula,
          correo: resultado.email ?? "",
          ficha: aprendiz.ficha.numero,
          programaFormacion: aprendiz.ficha.programa,
        },
        evaluacionResultado,
        resultado.tiempoUsado,
        preguntas,
        respuestas,
      );
      doc.save(
        `Evaluacion_${resultado.nombres.replace(/\s+/g, "")}_${resultado.cedula}_I${resultado.intento}.pdf`,
      );
    } catch {
      // silently ignore
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Render: Lookup step ────────────────────────────────────────────────────
  if (step === "lookup" || step === "not_found") {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-t-4 border-t-sena-green animate-slideUpAndFade">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl text-sena-blue font-bold flex items-center justify-center gap-2">
            <User className="w-6 h-6 text-sena-green" />
            Verificar Registro
          </CardTitle>
          <CardDescription>
            Ingresa tu número de ficha y cédula para verificar tu inscripción en la evaluación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="font-semibold text-sena-blue text-sm">Número de Ficha</Label>
            <Select value={fichaSeleccionada} onValueChange={setFichaSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu ficha..." />
              </SelectTrigger>
              <SelectContent>
                {fichas.map((f) => (
                  <SelectItem key={f.numero} value={f.numero}>
                    {f.numero} — {f.programa.slice(0, 45)}{f.programa.length > 45 ? "…" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sena-blue text-sm">Número de Documento</Label>
            <Input
              placeholder="Ej. 1020304050"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>

          {step === "not_found" && lookupError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {lookupError}
                <br />
                <span className="text-xs mt-1 block">
                  Contacta a tu instructor: {APP_CONFIG.instructorEmail}
                </span>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleLookup}
            disabled={lookupLoading || !fichaSeleccionada || !cedula.trim()}
            className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold py-6 text-base shadow-md gap-2"
          >
            {lookupLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {lookupLoading ? "Verificando..." : "Buscar mi registro"}
            {!lookupLoading && <ChevronRight className="w-5 h-5" />}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Render: Found step ─────────────────────────────────────────────────────
  if ((step === "found" || step === "starting") && aprendiz) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-t-4 border-t-sena-green animate-slideUpAndFade">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-sena-green shrink-0" />
            <CardTitle className="text-xl text-sena-blue font-bold">
              Registro encontrado
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Learner info card */}
          <div className="rounded-xl border border-sena-gray-dark/10 bg-sena-gray-light/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sena-blue text-lg leading-tight">
                  {aprendiz.nombres} {aprendiz.apellidos}
                </p>
                <p className="text-sm text-sena-gray-dark/60">
                  {aprendiz.tipoDocumento} {cedula}
                </p>
              </div>
              <Badge
                variant={aprendiz.puedeIniciar ? "default" : "destructive"}
                className={aprendiz.puedeIniciar ? "bg-sena-green text-white shrink-0" : "shrink-0"}
              >
                Intento {aprendiz.intentosUsados + 1} de {aprendiz.intentosPermitidos}
              </Badge>
            </div>

            <div className="border-t border-sena-gray-dark/10 pt-3 space-y-1.5 text-sm">
              <p>
                <span className="font-semibold text-sena-blue">Ficha:</span>{" "}
                <span className="font-mono">{aprendiz.ficha.numero}</span> ·{" "}
                <span className="text-sena-gray-dark/70">{aprendiz.ficha.programa}</span>
              </p>
              <p>
                <span className="font-semibold text-sena-blue">Evaluación:</span>{" "}
                {aprendiz.ficha.evaluacion.nombre}
              </p>
              <p className="text-xs text-sena-gray-dark/60 leading-relaxed">
                <span className="font-semibold">Competencia:</span>{" "}
                {aprendiz.ficha.evaluacion.competencia}
              </p>
              <p className="text-xs text-sena-gray-dark/60 leading-relaxed">
                <span className="font-semibold">Resultado de aprendizaje:</span>{" "}
                {aprendiz.ficha.evaluacion.resultadoAprendizaje}
              </p>

              {/* Dynamic config pills */}
              {(aprendiz.tiempoLimiteMinutos != null || aprendiz.totalPreguntas != null) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {aprendiz.tiempoLimiteMinutos != null && (
                    <span className="inline-flex items-center gap-1.5 bg-sena-blue/8 text-sena-blue text-xs font-semibold px-2.5 py-1 rounded-full border border-sena-blue/20">
                      <Clock size={11} />
                      {aprendiz.tiempoLimiteMinutos} min
                    </span>
                  )}
                  {aprendiz.totalPreguntas != null && aprendiz.totalPreguntas > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-sena-green/8 text-sena-green text-xs font-semibold px-2.5 py-1 rounded-full border border-sena-green/20">
                      <FileText size={11} />
                      {aprendiz.totalPreguntas} preguntas
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attempts exhausted */}
          {!aprendiz.puedeIniciar && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Has utilizado todos tus intentos disponibles ({aprendiz.intentosUsados}/
                  {aprendiz.intentosPermitidos}). Contacta a tu instructor para obtener
                  una nueva oportunidad.
                  <br />
                  <strong>📧 {APP_CONFIG.instructorEmail}</strong>
                </AlertDescription>
              </Alert>
              {aprendiz.ultimoResultadoId && (
                <Button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPdf}
                  variant="outline"
                  className="w-full gap-2 border-sena-blue/30 text-sena-blue hover:bg-sena-blue/5"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  {downloadingPdf ? "Generando informe..." : "Descargar mi informe (último intento)"}
                </Button>
              )}
            </div>
          )}

          {/* Email input */}
          {aprendiz.puedeIniciar && (
            <div className="space-y-1.5">
              <Label className="font-semibold text-sena-blue text-sm">
                Correo electrónico{" "}
                <span className="font-normal text-sena-gray-dark/50">(opcional — para recibir resultados)</span>
              </Label>
              <Input
                type="email"
                placeholder="ejemplo@misena.edu.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {startError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{startError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                setStep("lookup");
                setAprendiz(null);
                setStartError(null);
              }}
              disabled={step === "starting"}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </Button>

            {aprendiz.puedeIniciar && (
              <Button
                onClick={handleStart}
                disabled={step === "starting"}
                className="flex-1 bg-sena-green hover:bg-sena-green-dark text-white font-bold py-6 text-base shadow-md gap-2"
              >
                {step === "starting" && <Loader2 className="w-5 h-5 animate-spin" />}
                {step === "starting" ? "Iniciando..." : "Confirmar e Iniciar Evaluación"}
                {step !== "starting" && <ChevronRight className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// ── Legacy form (no DB, no fichas from DB) ─────────────────────────────────

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const legacySchema = z.object({
  nombres: z.string().min(2),
  apellidos: z.string().min(2),
  tipoDocumento: z.string().min(1),
  numeroDocumento: z.string().min(5),
  correo: z.string().email(),
  ficha: z.string().min(4),
  programaFormacion: z.string().min(1),
});

function LegacyForm({ fichas }: { fichas: FichaOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const iniciarEvaluacion = useEvaluacionStore((s) => s.iniciarEvaluacion);
  const setDatosAprendiz = useEvaluacionStore((s) => s.setDatosAprendiz);

  const form = useForm<z.infer<typeof legacySchema>>({
    resolver: zodResolver(legacySchema),
    defaultValues: {
      nombres: "", apellidos: "", tipoDocumento: "",
      numeroDocumento: "", correo: "", ficha: "", programaFormacion: "",
    },
  });

  async function onSubmit(values: z.infer<typeof legacySchema>) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/evaluacion/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: values.numeroDocumento.trim(), ficha: values.ficha.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Error al iniciar");
        return;
      }
      if (data.yaPresento) {
        setErrorMsg("La evaluación ya fue presentada anteriormente.");
        return;
      }

      setDatosAprendiz(values);
      iniciarEvaluacion(data.preguntas, data.tiempoLimite, data.fichaId ?? null, data.evaluacionId ?? null);
      router.push("/evaluacion");
    } catch {
      setErrorMsg("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-lg border-t-4 border-t-sena-green animate-slideUpAndFade">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl text-sena-blue font-bold">Registro del Aprendiz</CardTitle>
        <CardDescription className="text-sm">
          Complete sus datos para iniciar la evaluación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nombres" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue text-sm">Nombres</FormLabel>
                  <FormControl><Input placeholder="Juan Carlos" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="apellidos" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue text-sm">Apellidos</FormLabel>
                  <FormControl><Input placeholder="Pérez Gómez" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="tipoDocumento" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue text-sm">Tipo de Documento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione el tipo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                      <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                      <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                      <SelectItem value="PEP">Permiso Especial de Permanencia (PEP)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="numeroDocumento" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-sena-blue text-sm">Número de Documento</FormLabel>
                  <FormControl><Input placeholder="1020304050" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="correo" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-sena-blue text-sm">Correo Electrónico</FormLabel>
                <FormControl><Input placeholder="ejemplo@misena.edu.co" type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ficha" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-sena-blue text-sm">Número de Ficha</FormLabel>
                <FormControl><Input placeholder="2501234" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="programaFormacion" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold text-sena-blue text-sm">Programa de Formación</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione el programa" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {APP_CONFIG.programasFormacion.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {errorMsg && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold py-6 text-lg mt-4 shadow-md gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Verificando..." : "Iniciar Evaluación"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
