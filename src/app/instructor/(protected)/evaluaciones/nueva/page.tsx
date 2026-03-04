import { requireInstructor } from "@/lib/auth-utils";
import { EvaluacionFormTemplate } from "@/components/templates/EvaluacionFormTemplate";
import { PlusCircle } from "lucide-react";

export const metadata = {
  title: "Nueva Evaluación — EvalTIC Instructor",
};

export default async function NuevaEvaluacionPage() {
  await requireInstructor();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PlusCircle size={24} className="text-sena-green" />
        <div>
          <h1 className="text-2xl font-black text-sena-blue">Nueva Evaluación</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5">
            Configura los datos, carga el banco de preguntas y define la distribución.
          </p>
        </div>
      </div>

      <EvaluacionFormTemplate mode="create" />
    </div>
  );
}
