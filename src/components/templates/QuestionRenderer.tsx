"use client";

import { useEvaluacionStore } from "@/stores/evaluacion-store";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function QuestionRenderer() {
  const {
    preguntasSeleccionadas,
    preguntaActualIndex,
    respuestas,
    responderPregunta,
  } = useEvaluacionStore();

  const pregunta = preguntasSeleccionadas[preguntaActualIndex];
  if (!pregunta) return null;

  const qId = String(pregunta.id);
  const respuestaActual = respuestas[qId];

  const handleSeleccionUnica = (opcionId: string) => {
    responderPregunta({
      preguntaId: qId,
      respuestaIds: [opcionId],
    });
  };

  const handleSeleccionMultiple = (opcionId: string, checked: boolean) => {
    const prevIds = respuestaActual?.respuestaIds || [];
    let newIds = [...prevIds];

    if (checked) {
      newIds.push(opcionId);
    } else {
      newIds = newIds.filter((id) => id !== opcionId);
    }

    responderPregunta({
      preguntaId: qId,
      respuestaIds: newIds,
    });
  };

  const handleEmparejamiento = (subPreguntaId: string, opcionId: string) => {
    const prevEmp = respuestaActual?.emparejamientos || {};
    responderPregunta({
      preguntaId: qId,
      emparejamientos: {
        ...prevEmp,
        [subPreguntaId]: opcionId,
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-sena-green uppercase tracking-wider">
          Pregunta {preguntaActualIndex + 1} de {preguntasSeleccionadas.length}
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-sena-blue leading-tight">
          {pregunta.enunciado}
        </h3>
        {pregunta.tipo === "seleccion_multiple" && (
          <p className="text-sm text-sena-gray-dark/80 italic">
            * Puede seleccionar una o varias respuestas correctas.
          </p>
        )}
      </div>

      <div className="pt-4">
        {/* Renderizado de Selección Única */}
        {pregunta.tipo === "seleccion_unica" && (
          <RadioGroup
            key={qId}
            onValueChange={handleSeleccionUnica}
            value={respuestaActual?.respuestaIds?.[0] ?? ""}
            className="flex flex-col space-y-3"
          >
            {pregunta.opciones.map((opcion: any) => (
              <Label
                key={opcion.id}
                htmlFor={opcion.id}
                className={`flex items-start md:items-center space-x-3 space-y-0 p-4 border rounded-lg cursor-pointer transition-all hover:bg-sena-gray-light ${
                  respuestaActual?.respuestaIds?.[0] === opcion.id
                    ? "border-sena-green bg-sena-green/5 shadow-sm"
                    : "border-sena-gray-dark/20"
                }`}
              >
                <RadioGroupItem
                  value={opcion.id}
                  id={opcion.id}
                  className="mt-1 md:mt-0 text-sena-green border-sena-gray-dark/40"
                />
                <span className="text-base font-normal text-sena-blue leading-relaxed">
                  {opcion.texto}
                </span>
              </Label>
            ))}
          </RadioGroup>
        )}

        {/* Renderizado de Selección Múltiple */}
        {pregunta.tipo === "seleccion_multiple" && (
          <div className="flex flex-col space-y-3">
            {pregunta.opciones.map((opcion: any) => {
              const isSelected =
                respuestaActual?.respuestaIds?.includes(opcion.id) || false;
              return (
                <Label
                  key={opcion.id}
                  htmlFor={opcion.id}
                  className={`flex items-start md:items-center space-x-3 space-y-0 p-4 border rounded-lg cursor-pointer transition-all hover:bg-sena-gray-light ${
                    isSelected
                      ? "border-sena-green bg-sena-green/5 shadow-sm"
                      : "border-sena-gray-dark/20"
                  }`}
                >
                  <Checkbox
                    id={opcion.id}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleSeleccionMultiple(opcion.id, checked as boolean)
                    }
                    className="mt-1 md:mt-0 data-[state=checked]:bg-sena-green data-[state=checked]:text-white border-sena-gray-dark/40"
                  />
                  <span className="text-base font-normal text-sena-blue leading-relaxed">
                    {opcion.texto}
                  </span>
                </Label>
              );
            })}
          </div>
        )}

        {/* Renderizado de Emparejamiento */}
        {pregunta.tipo === "emparejamiento" && (
          <div className="flex flex-col space-y-4">
            {(pregunta.izquierdas ?? []).map((izq: string, index: number) => (
              <Card
                key={`emp-${index}`}
                className="shadow-none border border-sena-gray-dark/20 bg-sena-white"
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <span className="text-base text-sena-blue font-medium md:flex-1">
                    {izq}
                  </span>
                  <div className="w-full md:w-72 shrink-0">
                    <Select
                      value={respuestaActual?.emparejamientos?.[izq] || ""}
                      onValueChange={(val) => handleEmparejamiento(izq, val)}
                    >
                      <SelectTrigger className="w-full border-sena-gray-dark/30 focus:ring-sena-green">
                        <SelectValue placeholder="Seleccione la pareja..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(pregunta.derechas ?? []).map(
                          (der: string, i: number) => (
                            <SelectItem key={`der-${i}`} value={der}>
                              {der}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
