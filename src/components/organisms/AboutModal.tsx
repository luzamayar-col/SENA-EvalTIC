import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { APP_CONFIG } from "@/lib/config";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-full h-[100dvh] max-w-none border-none rounded-none sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:h-auto sm:max-h-[85vh] sm:border-solid sm:border sm:rounded-lg flex flex-col p-0 gap-0 overflow-hidden z-50"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Acerca de</DialogTitle>
          <DialogDescription>Información del sistema</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 text-center space-y-4">
          <Image
            src="/assets/logos/escudo-semilleros.svg"
            alt="SENA EvalTIC"
            width={80}
            height={80}
            className="w-auto h-20 mx-auto"
          />

          <div>
            <h3 className="text-lg font-bold text-sena-blue tracking-tight">
              {APP_CONFIG.title}
            </h3>
            <p className="text-xs text-sena-gray-dark font-medium mt-0.5">
              Versión 1.0.0
            </p>
          </div>

          <div className="text-sm text-sena-gray-dark space-y-2 text-left bg-sena-gray-light/30 rounded-xl p-5 border border-sena-gray-light">
            <p className="flex justify-between items-center border-b border-sena-gray-light pb-1.5">
              <span className="font-semibold text-sena-blue">Entidad</span>
              <span className="text-right text-xs">SENA</span>
            </p>
            <p className="flex justify-between items-center border-b border-sena-gray-light pb-1.5">
              <span className="font-semibold text-sena-blue">Centro</span>
              <span
                className="text-right text-xs max-w-[180px] truncate"
                title="SENA CEET"
              >
                CEET
              </span>
            </p>
            <p className="flex justify-between items-center pb-0.5 pt-1">
              <span className="font-semibold text-sena-blue">Regional</span>
              <span className="text-right text-xs">{APP_CONFIG.sede}</span>
            </p>
          </div>

          <p className="text-[11px] text-sena-gray-dark leading-relaxed bg-sena-gray-light/20 px-3 py-3 rounded-xl border border-sena-gray-light/50">
            Plataforma web para la gestión ágil de evaluaciones técnicas en
            línea, con validación de requisitos, control mediante temporizador,
            generación automatizada de reportes digitales (PDF) y envío seguro
            por correo electrónico a los aprendices y al instructor encargado.
          </p>

          <div className="bg-sena-green/10 rounded-xl p-3 border border-sena-green/20 mt-2 text-left">
            <p className="text-xs font-semibold text-sena-green mb-1">Autor:</p>
            <p className="text-[11px] text-sena-gray-dark leading-tight">
              Ing. Mauricio Alexander Vargas Rodríguez, MSc., MBA Esp. PM. <br />
              Instructor G14 del área de telecomunicaciones
            </p>
          </div>

          <div className="flex justify-center flex-col items-center gap-1 pt-3 pb-2 border-t border-sena-gray-light/50">
            <Image
              src="/assets/logos/logo-grupo-investigacion.svg"
              alt="GICS"
              width={100}
              height={40}
              className="h-10 w-auto grayscale opacity-80"
            />
            <p className="text-[10px] text-sena-gray-dark font-medium mt-2">
              © {new Date().getFullYear()} SENA — Servicio Nacional de
              Aprendizaje.
              <br /> Todos los derechos reservados.
            </p>
          </div>
        </div>

        <div className="flex-none p-4 border-t bg-muted/20 md:hidden">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-md border border-sena-gray-dark/20 text-sena-blue font-medium text-sm flex items-center justify-center"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
