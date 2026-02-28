"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/config";
import { BookOpen, Target, AlertTriangle } from "lucide-react";

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
        className="max-w-2xl border-t-4 border-t-sena-blue [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-sena-blue text-xl font-bold">
            Informacion de la Evaluacion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

        <DialogFooter>
          <Button
            onClick={onStart}
            className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold"
          >
            Entendido — Iniciar Evaluacion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
