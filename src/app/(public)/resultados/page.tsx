"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEvaluacionStore } from "@/stores/evaluacion-store";
import { APP_CONFIG } from "@/lib/config";
import { calcularPuntaje } from "@/lib/score";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  Home,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  AlertCircle,
  FlaskConical,
  LayoutDashboard,
} from "lucide-react";
import { generatePDF } from "@/lib/pdf-generator";

export default function ResultadosPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const emailSentRef = useRef(false);

  const {
    datosAprendiz,
    estado,
    preguntasSeleccionadas,
    respuestas,
    tiempoTranscurrido,
    reiniciarEstado,
    testMode,
    aprendizInfo,
  } = useEvaluacionStore();

  useEffect(() => {
    setMounted(true);
    if (estado !== "resultados") {
      router.push("/");
    }
  }, [estado, router]);

  const result = useMemo(() => {
    if (
      !mounted ||
      estado !== "resultados" ||
      !preguntasSeleccionadas.length ||
      !preguntasSeleccionadas[0].hasOwnProperty("respuestaCorrecta")
    ) {
      return null;
    }
    return calcularPuntaje(
      preguntasSeleccionadas,
      respuestas,
      APP_CONFIG.passingScorePercentage,
    );
  }, [mounted, estado, preguntasSeleccionadas, respuestas]);

  // Trigger send-email API when result is ready
  useEffect(() => {
    if (result && datosAprendiz && !emailSentRef.current) {
      emailSentRef.current = true;
      setEmailStatus("sending");

      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datosAprendiz,
          resultado: result,
          tiempoTranscurrido,
        }),
      })
        .then((res) => {
          if (res.ok) {
            setEmailStatus("success");
          } else {
            setEmailStatus("error");
          }
        })
        .catch(() => {
          setEmailStatus("error");
        });
    }
  }, [result, datosAprendiz, tiempoTranscurrido]);

  // In test mode build a synthetic DatosAprendiz from aprendizInfo
  const effectiveDatos = datosAprendiz ?? (testMode && aprendizInfo
    ? {
        nombres: aprendizInfo.nombres,
        apellidos: aprendizInfo.apellidos,
        tipoDocumento: aprendizInfo.tipoDocumento,
        numeroDocumento: "— Modo Prueba —",
        correo: aprendizInfo.email ?? "",
        ficha: "— Modo Prueba —",
        programaFormacion: aprendizInfo.programa,
      }
    : null);

  if (!mounted || estado !== "resultados" || !result || !effectiveDatos) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-sena-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sena-blue font-medium">Calculando resultados...</p>
        </div>
      </div>
    );
  }

  const {
    puntajeTotal,
    preguntasCorrectas,
    totalPreguntas,
    aprobado,
    puntajePorTema,
  } = result;

  // Bar chart data
  const temasData = puntajePorTema
    ? Object.keys(puntajePorTema).map((tema) => ({
        tema,
        puntaje: Math.round(puntajePorTema[tema]),
      }))
    : [];

  const getBarColor = (puntaje: number) => {
    if (puntaje >= 65) return "bg-sena-green";
    if (puntaje >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getBarTextColor = (puntaje: number) => {
    if (puntaje >= 65) return "text-sena-green";
    if (puntaje >= 40) return "text-amber-600";
    return "text-red-500";
  };

  const handleDescargarPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      if (!effectiveDatos || !result) return;

      const doc = await generatePDF(
        effectiveDatos,
        result,
        tiempoTranscurrido,
        preguntasSeleccionadas,
        respuestas,
      );

      const fileName = `Evaluacion_${effectiveDatos.nombres.replace(" ", "")}_${testMode ? "ModoPrueba" : effectiveDatos.numeroDocumento}.pdf`;

      // Use File System Access API to show a centred native "Save As" dialog
      if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
        try {
          const arrayBuffer = doc.output("arraybuffer");
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          const handle = await (
            window as typeof window & {
              showSaveFilePicker: (
                opts: object,
              ) => Promise<FileSystemFileHandle>;
            }
          ).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "Documento PDF",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: unknown) {
          // User cancelled (AbortError) → do nothing; other errors → fallback download
          if (
            !(err instanceof Error) ||
            (err as DOMException).name !== "AbortError"
          ) {
            doc.save(fileName);
          }
        }
      } else {
        doc.save(fileName);
      }
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el PDF. Por favor, intente de nuevo.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleVolverInicio = () => {
    reiniciarEstado();
    router.push(testMode ? "/instructor/evaluaciones" : "/");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Helper to determine if a question was answered correctly
  const getQuestionResult = (q: any) => {
    const qId = String(q.id);
    const userAnswer = respuestas[qId];

    if (!userAnswer) {
      return {
        status: "sin_responder" as const,
        userText: "No respondida",
        correctText: "",
        retroalimentacion: q.retroalimentacion || "",
      };
    }

    if (q.tipo === "seleccion_unica" || q.tipo === "seleccion_multiple") {
      const selectedTexts =
        q.opciones
          ?.filter((o: any) => userAnswer.respuestaIds?.includes(o.id))
          .map((o: any) => o.texto) || [];

      const correctIds = q.respuestaCorrecta || [];
      const correctTexts =
        q.opciones
          ?.filter((o: any) => correctIds.includes(o.id))
          .map((o: any) => o.texto) || [];

      const sortedSel = [...(userAnswer.respuestaIds || [])].sort();
      const sortedCorr = [...correctIds].sort();
      const isCorrect =
        sortedSel.length === sortedCorr.length &&
        sortedSel.every((v: string, i: number) => v === sortedCorr[i]);

      return {
        status: isCorrect ? ("correcta" as const) : ("incorrecta" as const),
        userText: selectedTexts.join("; ") || "Ninguna selección",
        correctText: correctTexts.join("; "),
        retroalimentacion: q.retroalimentacion || "",
      };
    }

    if (q.tipo === "emparejamiento") {
      const pares = q.pares || [];
      const emps = userAnswer.emparejamientos || {};
      const allCorrect = pares.every(
        (par: any) => emps[par.izquierda] === par.derecha,
      );

      const userPairs = pares.map(
        (par: any) =>
          `${par.izquierda} → ${emps[par.izquierda] || "Sin selección"}`,
      );
      const correctPairs = pares.map(
        (par: any) => `${par.izquierda} → ${par.derecha}`,
      );

      return {
        status: allCorrect ? ("correcta" as const) : ("incorrecta" as const),
        userText: userPairs.join("; "),
        correctText: correctPairs.join("; "),
        retroalimentacion: q.retroalimentacion || "",
      };
    }

    return {
      status: "sin_responder" as const,
      userText: "-",
      correctText: "",
      retroalimentacion: "",
    };
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col items-center py-8 px-4 bg-sena-gray-light/30">
      <div className="container max-w-4xl mx-auto space-y-8 animate-slideUpAndFade">
        {/* Test mode banner */}
        {testMode && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <FlaskConical className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-700">MODO PRUEBA — Los resultados no han sido guardados</p>
              <p className="text-xs text-amber-600">Este informe es solo para revisión del instructor y no quedará registrado en la base de datos.</p>
            </div>
          </div>
        )}

        {/* Email Sending Feedback UI */}
        {emailStatus !== "idle" && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl font-medium shadow-sm transition-all border ${
              emailStatus === "sending"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : emailStatus === "success"
                  ? "bg-green-50 text-sena-green border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {emailStatus === "sending" && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {emailStatus === "success" && <CheckCircle2 className="h-5 w-5" />}
            {emailStatus === "error" && <XCircle className="h-5 w-5" />}
            <span>
              {emailStatus === "sending" &&
                "Enviando copia de los resultados al instructor..."}
              {emailStatus === "success" &&
                "Copia de los resultados enviada al instructor correctamente."}
              {emailStatus === "error" &&
                "No se pudo enviar la copia por correo. Verifique configuración Resend."}
            </span>
          </div>
        )}

        {/* Header summary */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sena-blue">
            Resumen de Resultados
          </h1>
          <p className="text-lg text-sena-gray-dark/80">
            {effectiveDatos.nombres} {effectiveDatos.apellidos}
            {!testMode && ` — Ficha: ${effectiveDatos.ficha}`}
          </p>
          <div className="inline-flex flex-col gap-1 bg-sena-blue/5 border border-sena-blue/20 rounded-xl px-6 py-3 text-left max-w-2xl mx-auto">
            <p className="text-sm">
              <span className="font-bold text-sena-blue">Competencia: </span>
              <span className="text-sena-gray-dark">
                {APP_CONFIG.competencia.nombre}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-bold text-sena-blue">
                Resultado de aprendizaje:{" "}
              </span>
              <span className="text-sena-gray-dark">
                {APP_CONFIG.resultadoAprendizaje.nombre}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Main Score Card */}
          <Card
            className={`border-t-[6px] shadow-lg ${aprobado ? "border-t-sena-green" : "border-t-red-500"}`}
          >
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold text-sena-blue">
                Calificación Final
              </CardTitle>
              <CardDescription>Puntaje obtenido sobre 100</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-4 pb-8 space-y-6">
              <div
                className="relative flex items-center justify-center w-40 h-40 rounded-full border-[12px] shadow-inner bg-sena-gray-light/50"
                style={{ borderColor: aprobado ? "#39A900" : "#EF4444" }}
              >
                <span
                  className="text-5xl font-black"
                  style={{ color: aprobado ? "#39A900" : "#EF4444" }}
                >
                  {puntajeTotal}%
                </span>
              </div>

              <div className="flex items-center gap-2 font-bold text-lg">
                {aprobado ? (
                  <>
                    <CheckCircle2 className="text-sena-green w-6 h-6" />
                    <span className="text-sena-green uppercase tracking-wider">
                      Aprobado
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-500 w-6 h-6" />
                    <span className="text-red-500 uppercase tracking-wider">
                      No Aprobado
                    </span>
                  </>
                )}
              </div>

              <div className="w-full grid grid-cols-2 divide-x divide-sena-gray-dark/20 border-t border-sena-gray-dark/20 pt-4">
                <div className="flex flex-col items-center text-center px-2">
                  <span className="text-xs text-sena-gray-dark/70 font-bold uppercase mb-1">
                    Aciertos
                  </span>
                  <span className="text-xl font-bold text-sena-blue">
                    {preguntasCorrectas} / {totalPreguntas}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center px-2">
                  <span className="text-xs text-sena-gray-dark/70 font-bold uppercase mb-1">
                    Tiempo Utilizado
                  </span>
                  <span className="text-xl font-bold text-sena-blue flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sena-green" />
                    {formatTime(tiempoTranscurrido)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance by Topic — Horizontal Bars */}
          <Card className="border-t-[6px] border-t-sena-blue shadow-lg flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-sena-blue text-center">
                Desempeño por Área
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center gap-4 pb-6">
              {temasData.length > 0 ? (
                temasData.map((item) => (
                  <div key={item.tema} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sena-blue font-semibold truncate max-w-[70%]">
                        {item.tema}
                      </span>
                      <span
                        className={`font-bold ${getBarTextColor(item.puntaje)}`}
                      >
                        {item.puntaje}%
                      </span>
                    </div>
                    <div className="w-full bg-sena-gray-light rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getBarColor(item.puntaje)}`}
                        style={{ width: `${item.puntaje}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sena-gray-dark/60 text-center italic">
                  No hay datos suficientes para generar el gráfico por temática.
                </p>
              )}
              {temasData.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-sena-gray-dark/70 pt-2 border-t border-sena-gray-dark/10">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-sena-green inline-block" />{" "}
                    ≥65%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />{" "}
                    40-64%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />{" "}
                    &lt;40%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed question review — collapsible */}
        <Card className="shadow-lg border-t-[6px] border-t-sena-green">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setShowDetail(!showDetail)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-sena-blue flex items-center gap-2">
                <MessageSquareText className="w-5 h-5" />
                Detalle de Respuestas
              </CardTitle>
              {showDetail ? (
                <ChevronUp className="w-5 h-5 text-sena-gray-dark" />
              ) : (
                <ChevronDown className="w-5 h-5 text-sena-gray-dark" />
              )}
            </div>
            <CardDescription>
              Revise cada pregunta, su respuesta, la correcta y la
              retroalimentación.
            </CardDescription>
          </CardHeader>
          {showDetail && (
            <CardContent className="space-y-4 pt-0">
              {preguntasSeleccionadas.map((q, index) => {
                const qResult = getQuestionResult(q);
                const statusColor =
                  qResult.status === "correcta"
                    ? "border-l-sena-green bg-sena-green/5"
                    : qResult.status === "incorrecta"
                      ? "border-l-red-500 bg-red-50"
                      : "border-l-amber-500 bg-amber-50";

                return (
                  <div
                    key={q.id}
                    className={`border-l-4 rounded-lg p-4 space-y-2 ${statusColor}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-sena-blue">
                        Pregunta {index + 1}{" "}
                        <span className="font-normal text-sena-gray-dark/70">
                          ({q.tema || "General"} •{" "}
                          {q.tipo === "seleccion_unica"
                            ? "Selección única"
                            : q.tipo === "seleccion_multiple"
                              ? "Selección múltiple"
                              : "Emparejamiento"}
                          )
                        </span>
                      </h4>
                      {qResult.status === "correcta" ? (
                        <CheckCircle2 className="w-5 h-5 text-sena-green shrink-0" />
                      ) : qResult.status === "incorrecta" ? (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      )}
                    </div>

                    <p className="text-sm text-sena-blue">{q.enunciado}</p>

                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-semibold text-sena-gray-dark">
                          Su respuesta:{" "}
                        </span>
                        <span
                          className={
                            qResult.status === "correcta"
                              ? "text-sena-green"
                              : "text-red-600"
                          }
                        >
                          {qResult.userText}
                        </span>
                      </p>
                      {qResult.status !== "correcta" && qResult.correctText && (
                        <p>
                          <span className="font-semibold text-sena-gray-dark">
                            Respuesta correcta:{" "}
                          </span>
                          <span className="text-sena-green">
                            {qResult.correctText}
                          </span>
                        </p>
                      )}
                    </div>

                    {qResult.retroalimentacion && (
                      <div className="bg-white/70 rounded-md p-3 text-xs text-sena-gray-dark/90 border border-sena-gray-dark/10 mt-1">
                        <span className="font-bold text-sena-blue">
                          Retroalimentación:{" "}
                        </span>
                        {qResult.retroalimentacion}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6">
          <Button
            onClick={handleDescargarPDF}
            disabled={isGeneratingPDF}
            className="w-full sm:w-auto h-12 bg-sena-blue hover:bg-sena-blue-dark text-white font-bold text-base px-8 shadow-md transition-all gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileDown className="w-5 h-5" />
            )}
            {isGeneratingPDF ? "Generando Informe..." : "Descargar Informe PDF"}
          </Button>

          <Button
            variant="outline"
            onClick={handleVolverInicio}
            className="w-full sm:w-auto h-12 border-sena-gray-dark/30 hover:bg-sena-gray-light hover:text-sena-blue text-base font-bold px-8 transition-all gap-2"
          >
            {testMode ? <LayoutDashboard className="w-5 h-5" /> : <Home className="w-5 h-5" />}
            {testMode ? "Volver al Panel" : "Volver al Inicio"}
          </Button>
        </div>
      </div>
    </div>
  );
}
