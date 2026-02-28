"use client";

import { useEffect, useState } from "react";
import { useEvaluacionStore } from "@/stores/evaluacion-store";
import { Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EvaluacionTimer() {
  const tiempoRestante = useEvaluacionStore((state) => state.tiempoRestante);
  const tickTiempo = useEvaluacionStore((state) => state.tickTiempo);
  const estado = useEvaluacionStore((state) => state.estado);

  // Determinar si debemos parpadear en rojo (últimos 5 minutos = 300 segundos)
  const isTimeRunningOut = tiempoRestante <= 300 && tiempoRestante > 0;

  useEffect(() => {
    if (estado !== "evaluando") return;

    const timerInteval = setInterval(() => {
      tickTiempo();
    }, 1000);

    return () => clearInterval(timerInteval);
  }, [estado, tickTiempo]);

  // Formato MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-sm transition-colors w-fit",
        isTimeRunningOut
          ? "bg-red-100 text-red-600 border border-red-300 animate-pulse"
          : "bg-sena-white text-sena-blue border border-sena-gray-dark/20",
      )}
    >
      {isTimeRunningOut ? (
        <AlertTriangle className="w-5 h-5" />
      ) : (
        <Timer className="w-5 h-5 text-sena-green" />
      )}
      <span className="text-lg font-mono tracking-wider">
        {formatTime(tiempoRestante)}
      </span>
    </div>
  );
}
