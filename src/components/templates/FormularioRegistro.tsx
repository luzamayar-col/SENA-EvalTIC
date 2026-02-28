"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEvaluacionStore } from "@/stores/evaluacion-store";
import { APP_CONFIG } from "@/lib/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  nombres: z.string().min(2, { message: "Ingrese al menos 2 caracteres." }),
  apellidos: z.string().min(2, { message: "Ingrese al menos 2 caracteres." }),
  tipoDocumento: z
    .string()
    .min(1, { message: "Seleccione un tipo de documento." }),
  numeroDocumento: z.string().min(5, { message: "Ingrese un número válido." }),
  correo: z
    .string()
    .email({ message: "Ingrese un correo electrónico válido." }),
  ficha: z.string().min(4, { message: "Ingrese un número de ficha válido." }),
  programaFormacion: z
    .string()
    .min(1, { message: "Seleccione un programa de formación." }),
});

export function FormularioRegistro() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorEvaluacion, setErrorEvaluacion] = useState<{
    yaPresento?: boolean;
    mensaje: string;
    fecha?: string;
    puntaje?: number;
  } | null>(null);

  const setDatosAprendiz = useEvaluacionStore(
    (state) => state.setDatosAprendiz,
  );
  const iniciarEvaluacion = useEvaluacionStore(
    (state) => state.iniciarEvaluacion,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombres: "",
      apellidos: "",
      tipoDocumento: "",
      numeroDocumento: "",
      correo: "",
      ficha: "",
      programaFormacion: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setErrorEvaluacion(null);

    try {
      const resp = await fetch("/api/evaluacion/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: values.numeroDocumento }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        setErrorEvaluacion({
          mensaje: data.error || "Error al iniciar la evaluación",
        });
        setLoading(false);
        return;
      }

      if (data.yaPresento) {
        setErrorEvaluacion({
          yaPresento: true,
          mensaje: "La evaluación ya fue presentada anteriormente.",
          fecha: data.fecha,
          puntaje: data.puntaje,
        });
        setLoading(false);
        return;
      }

      // Guardar datos en el store global
      setDatosAprendiz(values);

      // Iniciar evaluación en el store (con las preguntas preparadas por el backend)
      iniciarEvaluacion(data.preguntas, data.tiempoLimite);

      router.push("/evaluacion");
    } catch (error) {
      console.error(error);
      setErrorEvaluacion({
        mensaje: "Error de conexión al iniciar la evaluación.",
      });
      setLoading(false);
    }
  }

  if (errorEvaluacion?.yaPresento) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-t-4 border-t-destructive animate-slideUpAndFade">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl text-destructive font-bold flex items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Evaluación ya presentada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md space-y-2 text-center text-sm">
            <p>
              <strong>Aprendiz:</strong> {form.getValues().nombres}{" "}
              {form.getValues().apellidos}
            </p>
            <p>
              <strong>Cédula:</strong> {form.getValues().numeroDocumento}
            </p>
            <p>
              <strong>Fecha de presentación:</strong>{" "}
              {new Date(errorEvaluacion.fecha!).toLocaleString()}
            </p>
            <p>
              <strong>Puntaje obtenido:</strong> {errorEvaluacion.puntaje}%
            </p>
          </div>
          <Alert variant="destructive">
            <AlertDescription className="text-center">
              Esta evaluación solo puede presentarse una vez. Si requiere una
              nueva oportunidad, contacte a su instructor.
              <br />
              <br />
              <strong>📧 Instructor:</strong> {APP_CONFIG.instructorEmail}
            </AlertDescription>
          </Alert>
          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => {
              setErrorEvaluacion(null);
              form.reset();
            }}
          >
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg border-t-4 border-t-sena-green animate-slideUpAndFade">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl text-sena-blue font-bold">
          Registro del Aprendiz
        </CardTitle>
        <CardDescription className="text-sm">
          Por favor, ingrese sus datos para iniciar la evaluación. Tendrá{" "}
          {APP_CONFIG.timeLimitMinutes} minutos para responder{" "}
          {APP_CONFIG.totalQuestions} preguntas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-gray-dark font-semibold">
                      Nombres
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Juan Carlos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-gray-dark font-semibold">
                      Apellidos
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Pérez Gómez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipoDocumento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-gray-dark font-semibold">
                      Tipo de Documento
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CC">
                          Cédula de Ciudadanía (CC)
                        </SelectItem>
                        <SelectItem value="TI">
                          Tarjeta de Identidad (TI)
                        </SelectItem>
                        <SelectItem value="CE">
                          Cédula de Extranjería (CE)
                        </SelectItem>
                        <SelectItem value="PEP">
                          Permiso Especial de Permanencia (PEP)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numeroDocumento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-gray-dark font-semibold">
                      Número de Documento
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 1020304050" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="correo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sena-gray-dark font-semibold">
                    Correo Electrónico (Institucional o Personal)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ejemplo@misena.edu.co"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ficha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-gray-dark font-semibold">
                      Número de Ficha
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 2501234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="programaFormacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sena-gray-dark font-semibold">
                    Programa de Formación
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el programa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {APP_CONFIG.programasFormacion.map((programa) => (
                        <SelectItem key={programa} value={programa}>
                          {programa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold py-6 text-lg mt-4 shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Verificando..." : "Iniciar Evaluación"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
