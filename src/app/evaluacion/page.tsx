"use client";

import { useEffect, useState } from "react";
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
import { BookOpen, Target } from "lucide-react";

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
  } = useEvaluacionStore();

  const [finalizando, setFinalizando] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (estado === "inicio" || !datosAprendiz) {
      router.push("/");
    } else if (estado === "resultados") {
      router.push("/resultados");
    }
  }, [estado, datosAprendiz, router]);

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
    await finalizarEvaluacion();
    setFinalizando(false);
  };

  const progress =
    ((preguntaActualIndex + 1) / preguntasSeleccionadas.length) * 100;
  const isLastQuestion =
    preguntaActualIndex === preguntasSeleccionadas.length - 1;

  const preguntasRespondidasCount = Object.keys(respuestas).length;
  const faltanPorResponder =
    preguntasSeleccionadas.length - preguntasRespondidasCount;

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col items-center py-6 px-4 bg-sena-gray-light/30">
      <div className="container max-w-5xl mx-auto w-full space-y-4">
        <EvaluacionStartModal
          open={showStartModal}
          onStart={() => setShowStartModal(false)}
        />

        {/* Competencia & Resultado de Aprendizaje Banner */}
        <div className="bg-white border border-sena-gray-dark/10 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-3 items-start">
              <Target className="w-5 h-5 text-sena-green shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-sena-blue">
                  Competencia ({APP_CONFIG.competencia.codigo}):
                </span>
                <p className="text-sena-gray-dark/80 mt-0.5">
                  {APP_CONFIG.competencia.nombre}
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <BookOpen className="w-5 h-5 text-sena-green shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-sena-blue">
                  Resultado de Aprendizaje (
                  {APP_CONFIG.resultadoAprendizaje.codigo}):
                </span>
                <p className="text-sena-gray-dark/80 mt-0.5">
                  {APP_CONFIG.resultadoAprendizaje.nombre}
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
                    Evaluación Técnica en Curso
                  </h2>
                  <p className="text-sm text-sena-gray-dark/80">
                    {datosAprendiz?.nombres} {datosAprendiz?.apellidos}
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
                        disabled={finalizando}
                        className="w-full sm:w-auto bg-sena-green hover:bg-sena-green-dark text-white font-bold transition-colors"
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
                    className="w-full sm:w-auto bg-sena-green hover:bg-sena-green-dark text-white transition-colors"
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
                      disabled={isAnswered && !isCurrent}
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
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
