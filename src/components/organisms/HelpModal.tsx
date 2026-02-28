import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-full h-[100dvh] max-w-none border-none rounded-none sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[85vh] sm:border-solid sm:border sm:rounded-lg flex flex-col p-0 gap-0 overflow-hidden z-50"
        onInteractOutside={(e) => e.preventDefault()}
        aria-describedby="help-modal-description"
      >
        <DialogHeader className="px-5 py-4 border-b bg-muted/20 flex-none m-0">
          <DialogTitle className="flex items-center gap-2 text-xl text-sena-blue">
            <HelpCircle className="w-6 h-6 text-sena-green" />
            Guía de Referencia
          </DialogTitle>
          <DialogDescription
            id="help-modal-description"
            className="text-sena-gray-dark/80 mt-1"
          >
            Plataforma de evaluación de conocimientos en línea
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-4 text-sm text-sena-gray-dark">
          {[
            {
              step: 1,
              title: "Registro de Aprendiz",
              desc: "Complete sus datos personales, información de contacto y seleccione el programa de formación correspondiente.",
            },
            {
              step: 2,
              title: "Inicio del Temporizador",
              desc: "Al iniciar, comenzará el contador de tiempo asignado para la prueba de conocimiento.",
            },
            {
              step: 3,
              title: "Desarrollo de la Prueba",
              desc: "Responda a las preguntas aleatorias seleccionando la o las opciones de acuerdo al tipo de pregunta (única, múltiple o emparejamiento).",
            },
            {
              step: 4,
              title: "Navegación",
              desc: "Puede moverse entre las instrucciones, las diferentes preguntas y consultar el resumen donde se colorean contestadas/sin contestar.",
            },
            {
              step: 5,
              title: "Finalización",
              desc: "Una vez concluya y revise el resumen, haga clic en 'Finalizar' para enviar las respuestas. El sistema emitirá su informe de resultados automáticamente.",
            },
            {
              step: 6,
              title: "Recepción de Resultados",
              desc: "Podrá descargar el comprobante en PDF detallando las respuestas y el resultado global. El mismo comprobante será remitido por correo electrónico.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-sm bg-sena-green text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-sena-blue mb-0.5">
                  {item.title}
                </h3>
                <p className="leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-none p-4 border-t bg-muted/20 md:hidden">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-md border border-sena-gray-dark/20 text-sena-blue font-medium text-sm flex items-center justify-center"
          >
            Cerrar Guía
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
