"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEvaluacionStore } from "@/stores/evaluacion-store";
import { APP_CONFIG } from "@/lib/config";
import { EvaluacionTimer } from "@/components/molecules/EvaluacionTimer";
import { EvaluacionStartModal } from "@/components/molecules/EvaluacionStartModal";
import { QuestionRenderer } from "@/components/templates/QuestionRenderer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookOpen, Target, FlaskConical, Hash, ShieldAlert, CheckCircle2, AlertTriangle, X, Loader2 } from "lucide-react";

export default function EvaluacionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const {
    datosAprendiz,
    estado,
    preguntasSeleccionadas,
    preguntaActualIndex,
    siguientePregunta,
    avanzarAPregunta,
    finalizarEvaluacion,
    respuestas,
    testMode,
    intentoNumero,
    aprendizInfo,
    tiempoRestante,
    tiempoTranscurrido,
    umbralAntiplagio,
  } = useEvaluacionStore();

  const umbralMedio = umbralAntiplagio?.medio ?? 3;
  const umbralAlto = umbralAntiplagio?.alto ?? 5;

  const [finalizando, setFinalizando] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const [tabBlurred, setTabBlurred] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showFirstWarning, setShowFirstWarning] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const anulandoRef = useRef(false);
  // Guard against multiple events firing simultaneously (blur + visibilitychange + fullscreenchange)
  const isHiddenRef = useRef(false);

  // Fullscreen: request when evaluation starts, detect exit as focus-loss event
  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // First-incident banner: show once when tabSwitches first becomes 1, auto-dismiss after 8s
  useEffect(() => {
    if (tabSwitches !== 1) return;
    setShowFirstWarning(true);
    const t = setTimeout(() => setShowFirstWarning(false), 8000);
    return () => clearTimeout(t);
  }, [tabSwitches]);

  // Anti-plagiarism: block copy/print shortcuts, right-click, clipboard events
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // NOTE: e.preventDefault() on PrintScreen does NOT prevent OS-level screenshots.
      // Triggering blur manually ensures the NEXT attempt captures the overlay instead.
      if (e.key === "PrintScreen") {
        e.preventDefault();
        setTabBlurred(true);
        setTabSwitches((n) => n + 1);
        return;
      }
      const blocked =
        (e.ctrlKey && ["c", "a", "p", "u", "s"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) ||
        e.key === "F12";
      if (blocked) e.preventDefault();
    };
    // Block clipboard at the event level (complements Ctrl+C key blocking)
    const handleClipboard = (e: ClipboardEvent) => e.preventDefault();
    const handleContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("keydown", handleKey);
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("cut", handleClipboard);
    document.addEventListener("contextmenu", handleContext);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
      document.removeEventListener("contextmenu", handleContext);
    };
  }, []);

  // Anti-plagiarism: blur content on focus loss (Alt+Tab, minimizar, cambio de app).
  // NOTA: Win+Shift+S y capturas de móvil ocurren a nivel OS y NO disparan blur/visibilitychange;
  // el watermark en pantalla hace esas capturas trazables.
  useEffect(() => {
    // Guard: blur + visibilitychange + fullscreenchange all fire at once on tab switch.
    // Only count ONE incidence per "leave" event using a ref flag.
    const hide = () => {
      if (isHiddenRef.current) return;
      isHiddenRef.current = true;
      setTabBlurred(true);
      setTabSwitches((n) => n + 1);
    };
    const show = () => {
      isHiddenRef.current = false;
      setTabBlurred(false);
    };
    const handleVisibility = () => { if (document.hidden) hide(); else show(); };
    // fullscreenchange: only count as incident when losing fullscreen while page is visible
    // (avoid double-counting with visibilitychange when switching tabs)
    const handleFullscreen = () => { if (!document.fullscreenElement && !document.hidden) hide(); };
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
    };
  }, []);

  // Auto-anular: when antiplagio incidents reach umbralAlto, submit with score=0
  useEffect(() => {
    if (tabSwitches < umbralAlto) return;
    if (estado !== "evaluando") return;
    if (anulandoRef.current) return;
    anulandoRef.current = true;
    setAnulando(true);
    finalizarEvaluacion(tabSwitches, true).finally(() => setAnulando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabSwitches, umbralAlto, estado]);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    // In test mode datosAprendiz is null but we allow it through
    if (estado === "inicio" || (!datosAprendiz && !testMode)) {
      router.push("/");
    } else if (estado === "resultados") {
      router.push("/resultados");
    }
  }, [estado, datosAprendiz, testMode, router]);

  // Auto-submit when timer reaches 0 — saves answered questions to DB
  useEffect(() => {
    if (tiempoRestante !== 0) return;
    if (tiempoTranscurrido === 0) return; // hasn't started yet
    if (estado !== "evaluando") return;
    if (finalizando) return;
    setFinalizando(true);
    finalizarEvaluacion(tabSwitches).finally(() => setFinalizando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiempoRestante]);

  if (!mounted || estado !== "evaluando") {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-sena-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sena-blue font-medium">Cargando evaluación...</p>
        </div>
      </div>
    );
  }

  const handleFinalizar = async () => {
    setFinalizando(true);
    await finalizarEvaluacion(tabSwitches);
    setFinalizando(false);
  };

  const progress =
    ((preguntaActualIndex + 1) / preguntasSeleccionadas.length) * 100;
  const isLastQuestion =
    preguntaActualIndex === preguntasSeleccionadas.length - 1;

  const preguntasRespondidasCount = Object.keys(respuestas).length;
  const faltanPorResponder =
    preguntasSeleccionadas.length - preguntasRespondidasCount;

  const preguntaActual = preguntasSeleccionadas[preguntaActualIndex];
  const qId = preguntaActual ? String(preguntaActual.id) : null;
  const respuestaActual = qId ? respuestas[qId] : null;

  const isCurrentQuestionAnswered = (() => {
    if (!preguntaActual || !respuestaActual) return false;

    if (
      preguntaActual.tipo === "seleccion_unica" ||
      preguntaActual.tipo === "seleccion_multiple"
    ) {
      return (
        respuestaActual.respuestaIds && respuestaActual.respuestaIds.length > 0
      );
    } else if (preguntaActual.tipo === "emparejamiento") {
      const numOfPairs = preguntaActual.izquierdas?.length || 0;
      const matchedPairs = Object.keys(
        respuestaActual.emparejamientos || {},
      ).filter((key) => respuestaActual.emparejamientos![key] !== "").length;
      return numOfPairs > 0 && matchedPairs === numOfPairs;
    }
    return false;
  })();

  return (
    <div
      className="w-full min-h-[calc(100vh-140px)] flex flex-col items-center py-6 px-4 bg-sena-gray-light/30 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Block printing */}
      <style>{`@media print { body { display: none !important; } }`}</style>

      {/* On-screen watermark: makes any screenshot (incl. Win+Shift+S and mobile) trazable */}
      {datosAprendiz && !testMode && (
        <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden select-none" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-sena-blue/[0.07] font-bold text-base whitespace-nowrap"
              style={{
                top: `${i * 10}%`,
                left: "-30%",
                width: "160%",
                transform: "rotate(-30deg)",
              }}
            >
              {`${datosAprendiz.nombres} ${datosAprendiz.apellidos} · ${datosAprendiz.tipoDocumento}: ${datosAprendiz.numeroDocumento}`}
            </span>
          ))}
        </div>
      )}

      {/* Tab-switch / focus-loss overlay */}
      {tabBlurred && (
        <div
          className={cn(
            "fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-4",
            !anulando && tabSwitches < umbralAlto && "cursor-pointer"
          )}
          onClick={() => {
            if (tabSwitches >= umbralAlto) return; // no permitir volver si fue anulada
            setTabBlurred(false);
            requestFullscreen();
          }}
        >
          <ShieldAlert className={cn(
            "w-16 h-16",
            tabSwitches >= umbralAlto ? "text-red-400" : "text-amber-400"
          )} />

          {tabSwitches >= umbralAlto ? (
            /* ── Pantalla de anulación ── */
            <>
              <p className="text-white text-2xl font-black uppercase tracking-widest">Evaluación Anulada</p>
              <p className="text-white/70 text-sm text-center max-w-sm px-4">
                Se superó el límite de incidencias antiplagio ({umbralAlto}). Esta evaluación ha sido registrada con calificación <span className="text-red-400 font-bold">0%</span>.
              </p>
              <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-red-500/20 text-red-300">
                <AlertTriangle size={12} />
                {tabSwitches} incidencias registradas
              </div>
              {anulando ? (
                <div className="mt-2 flex items-center gap-2 text-white/60 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Guardando resultado...
                </div>
              ) : (
                <p className="mt-2 text-white/50 text-xs">Redirigiendo al resumen...</p>
              )}
            </>
          ) : (
            /* ── Pantalla de pausa normal ── */
            <>
              <p className="text-white text-xl font-bold">Evaluación en pausa</p>
              <p className="text-white/70 text-sm text-center max-w-sm px-4">
                {tabSwitches <= 1
                  ? "Se detectó un cambio de pantalla. Esta actividad ha quedado registrada en tu sesión."
                  : tabSwitches <= umbralMedio
                  ? "Has salido de la evaluación varias veces. Cada incidencia queda registrada en tu reporte."
                  : `¡Atención! Solo quedan ${umbralAlto - tabSwitches} incidencia(s) antes de que la evaluación sea anulada automáticamente.`}
              </p>
              <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300">
                <AlertTriangle size={12} />
                {tabSwitches} {tabSwitches === 1 ? "incidencia registrada" : "incidencias registradas"}
              </div>
              <button
                className="mt-2 bg-white/10 hover:bg-white/20 text-white text-sm px-6 py-2 rounded-lg transition-colors"
                onClick={(e) => { e.stopPropagation(); setTabBlurred(false); requestFullscreen(); }}
              >
                Volver a la evaluación
              </button>
            </>
          )}
        </div>
      )}

      <div className={cn(
        "container max-w-5xl mx-auto w-full space-y-4 transition-[filter] duration-75",
        tabBlurred && "blur-xl pointer-events-none"
      )}>
        <EvaluacionStartModal
          open={showStartModal}
          onStart={() => { setShowStartModal(false); requestFullscreen(); }}
        />

        {/* Test mode banner */}
        {testMode && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <FlaskConical className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-700">MODO PRUEBA</p>
              <p className="text-xs text-amber-600">Los resultados de esta sesión no serán guardados en la base de datos.</p>
            </div>
          </div>
        )}

        {/* Attempt badge + info row */}
        <div className="flex flex-wrap items-center gap-2">
          {intentoNumero != null && intentoNumero > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-sena-blue/10 text-sena-blue text-xs font-bold px-3 py-1.5 rounded-full">
              <Hash size={12} />
              Intento {intentoNumero}
            </span>
          )}
        </div>

        {/* First-incident warning banner — auto-dismisses after 8s */}
        {showFirstWarning && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 animate-fade-in-up">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-700">Actividad registrada</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Se detectó un cambio de contexto. Tu actividad durante la evaluación queda registrada y el instructor podrá verla en el reporte de tu sesión.
              </p>
            </div>
            <button
              onClick={() => setShowFirstWarning(false)}
              className="text-amber-500 hover:text-amber-700 shrink-0 p-0.5"
              aria-label="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Competencia & Resultado de Aprendizaje Banner */}
        <div className="bg-white border border-sena-gray-dark/10 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-3 items-start">
              <Target className="w-5 h-5 text-sena-green shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-sena-blue">Competencia:</span>
                <p className="text-sena-gray-dark/80 mt-0.5">
                  {aprendizInfo?.competencia ?? APP_CONFIG.competencia.nombre}
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <BookOpen className="w-5 h-5 text-sena-green shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-sena-blue">Resultado de Aprendizaje:</span>
                <p className="text-sena-gray-dark/80 mt-0.5">
                  {aprendizInfo?.resultadoAprendizaje ?? APP_CONFIG.resultadoAprendizaje.nombre}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Interface (Left / Center) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <Card className="border-t-4 border-t-sena-blue shadow-lg animate-fade-in-up">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-sena-gray-dark/10">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-sena-blue">
                    {testMode ? "Evaluación — Modo Prueba" : "Evaluación Técnica en Curso"}
                  </h2>
                  <p className="text-sm text-sena-gray-dark/80">
                    {testMode
                      ? `${aprendizInfo?.nombres ?? ""} ${aprendizInfo?.apellidos ?? ""}`.trim()
                      : `${datosAprendiz?.nombres ?? ""} ${datosAprendiz?.apellidos ?? ""}`.trim()
                    }
                  </p>
                </div>
                <EvaluacionTimer />
              </CardHeader>
              <CardContent className="pt-8 pb-4 min-h-[400px]">
                <QuestionRenderer />
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-sena-gray-dark/10 pt-6">
                <div className="hidden sm:block text-sm font-medium text-sena-gray-dark">
                  Progreso: {Math.round(progress)}%
                </div>

                {isLastQuestion ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={finalizando || !isCurrentQuestionAnswered}
                        className={cn(
                          "w-full sm:w-auto font-bold transition-colors text-white",
                          isCurrentQuestionAnswered
                            ? "bg-sena-green hover:bg-sena-green-dark"
                            : "bg-sena-gray-dark cursor-not-allowed opacity-50",
                        )}
                      >
                        {finalizando ? "Evaluando..." : "Finalizar Prueba"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-sena-white border-sena-blue">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-sena-blue">
                          ¿Confirmar envío?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sena-gray-dark">
                          {faltanPorResponder > 0
                            ? `Atención: Aún tiene ${faltanPorResponder} pregunta(s) sin responder. ¿Está seguro de que desea enviar la prueba ahora?`
                            : "Ha respondido todas las preguntas. ¿Desea enviar la prueba para su calificación?"}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          disabled={finalizando}
                          className="border-sena-gray-dark/20"
                        >
                          Revisar respuestas
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleFinalizar}
                          disabled={finalizando}
                          className="bg-sena-green hover:bg-sena-green-dark text-white"
                        >
                          {finalizando ? "Evaluando..." : "Sí, enviar ahora"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    onClick={siguientePregunta}
                    disabled={!isCurrentQuestionAnswered}
                    className={cn(
                      "w-full sm:w-auto text-white transition-colors",
                      isCurrentQuestionAnswered
                        ? "bg-sena-green hover:bg-sena-green-dark"
                        : "bg-sena-gray-dark cursor-not-allowed opacity-50",
                    )}
                  >
                    Siguiente Pregunta
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar Navigation Panel (Right) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-md border border-sena-gray-dark/10 bg-sena-white">
              <CardHeader className="py-4 border-b border-sena-gray-dark/10">
                <h3 className="font-bold text-sena-blue text-sm uppercase tracking-wide">
                  Navegación
                </h3>
                <Progress
                  value={progress}
                  className="h-2 mt-2 bg-sena-gray-light [&>div]:bg-sena-green"
                />
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-4 gap-2">
                {preguntasSeleccionadas.map((q, idx) => {
                  const isAnswered = !!respuestas[String(q.id)];
                  const isCurrent = preguntaActualIndex === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => !isAnswered && avanzarAPregunta(idx)}
                      disabled={
                        (isAnswered && !isCurrent) ||
                        (!isAnswered && !isCurrentQuestionAnswered)
                      }
                      className={cn(
                        "h-10 w-full rounded-md text-xs font-bold transition-all flex items-center justify-center border",
                        isCurrent
                          ? "ring-2 ring-sena-green ring-offset-1 border-sena-green bg-sena-green/10 text-sena-green"
                          : isAnswered
                            ? "bg-sena-green text-white border-sena-green cursor-default opacity-80"
                            : "bg-sena-white text-sena-gray-dark border-sena-gray-dark/30 hover:bg-sena-gray-light hover:text-sena-blue",
                      )}
                      aria-label={`Pregunta ${idx + 1}${isAnswered ? " (respondida)" : ""}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </CardContent>
              <CardFooter className="bg-sena-gray-light/50 p-4 border-t border-sena-gray-dark/10 flex flex-col gap-1 text-xs">
                <div className="flex justify-between w-full">
                  <span className="text-sena-gray-dark">Respondidas:</span>
                  <span className="font-bold text-sena-green">
                    {preguntasRespondidasCount}
                  </span>
                </div>
                <div className="flex justify-between w-full">
                  <span className="text-sena-gray-dark">Sin responder:</span>
                  <span className="font-bold text-red-500">
                    {faltanPorResponder}
                  </span>
                </div>

                {/* Integrity monitor — visible in both real and test mode */}
                <div className="w-full border-t border-sena-gray-dark/10 mt-1 pt-2 space-y-1">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sena-gray-dark">Integridad:</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      tabSwitches === 0
                        ? "bg-green-100 text-green-700"
                        : tabSwitches < umbralMedio
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {tabSwitches === 0 ? (
                        <><CheckCircle2 size={10} /> Normal</>
                      ) : (
                        <><AlertTriangle size={10} /> {tabSwitches} {tabSwitches === 1 ? "incidencia" : "incidencias"}</>
                      )}
                    </span>
                  </div>
                  {tabSwitches > 0 && (
                    <p className={cn(
                      "text-[10px] leading-tight",
                      tabSwitches < umbralMedio ? "text-amber-600" : "text-red-600"
                    )}>
                      {tabSwitches < umbralMedio
                        ? "Tu actividad ha sido registrada."
                        : "El instructor revisará tu sesión."}
                    </p>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
