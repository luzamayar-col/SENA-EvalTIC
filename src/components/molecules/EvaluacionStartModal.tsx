"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/config";
import { BookOpen, Target, AlertTriangle, ShieldAlert } from "lucide-react";

interface EvaluacionStartModalProps {
  open: boolean;
  onStart: () => void;
}

export function EvaluacionStartModal({
  open,
  onStart,
}: EvaluacionStartModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-full h-[100dvh] max-w-none border-none rounded-none sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[85vh] sm:border-solid sm:border sm:rounded-lg sm:border-t-4 sm:border-t-sena-blue flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden z-50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby="start-modal-description"
      >
        <DialogHeader className="px-5 py-4 border-b bg-muted/20 flex-none m-0">
          <DialogTitle className="text-sena-blue text-xl font-bold">
            Informacion de la Evaluacion
          </DialogTitle>
          <div id="start-modal-description" className="sr-only">
            Instrucciones antes de iniciar
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-4">
          {/* Competencia */}
          <div className="flex gap-3 items-start bg-sena-gray-light/50 rounded-lg p-4">
            <Target className="w-5 h-5 text-sena-green shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-sena-blue">
                Competencia ({APP_CONFIG.competencia.codigo})
              </p>
              <p className="text-sena-gray-dark/80 mt-1">
                {APP_CONFIG.competencia.nombre}
              </p>
            </div>
          </div>

          {/* Resultado de Aprendizaje */}
          <div className="flex gap-3 items-start bg-sena-gray-light/50 rounded-lg p-4">
            <BookOpen className="w-5 h-5 text-sena-green shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-sena-blue">
                Resultado de Aprendizaje (
                {APP_CONFIG.resultadoAprendizaje.codigo})
              </p>
              <p className="text-sena-gray-dark/80 mt-1">
                {APP_CONFIG.resultadoAprendizaje.nombre}
              </p>
            </div>
          </div>

          {/* Integrity monitoring notice */}
          <div className="flex gap-3 items-start bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-blue-700">Monitoreo de integridad</p>
              <ul className="text-blue-700/80 mt-1.5 space-y-1 text-xs list-disc list-inside">
                <li>Los cambios de pestaña y salidas de pantalla quedan registrados</li>
                <li>Las capturas de pantalla llevan tu nombre e identificación visibles</li>
                <li>El portapapeles (copiar/pegar) está deshabilitado durante la evaluación</li>
                <li>El instructor verá el número de incidencias detectadas en tu sesión</li>
              </ul>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-700">Importante</p>
              <p className="text-amber-700/90 mt-1">
                Una vez que seleccione su respuesta y haga clic en{" "}
                <strong>Siguiente</strong>, no podra regresar a la pregunta
                anterior. Lea cada pregunta con detenimiento antes de responder.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-none p-4 border-t bg-muted/20">
          <Button
            onClick={onStart}
            className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold"
          >
            Entendido — Iniciar Evaluacion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
