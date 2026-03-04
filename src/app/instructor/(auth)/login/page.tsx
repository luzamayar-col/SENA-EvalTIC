"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function InstructorLoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/instructor/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-sena-blue flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Correo o contraseña incorrectos. Verifica tus credenciales.");
    } else if (result?.ok) {
      router.push("/instructor/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-sena-blue flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slideUpAndFade">
        {/* Logo & header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-lg mb-4">
            <Image
              src="/assets/logos/escudo-semilleros.svg"
              alt="SENA Logo"
              width={84}
              height={84}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Panel del Instructor</h1>
          <p className="text-white/70 text-sm mt-1">SENA EvalTIC — Área Administrativa</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-t-4 border-t-sena-green">
          <h2 className="text-xl font-bold text-sena-blue mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-sena-green" />
            Iniciar Sesión
          </h2>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-blue font-semibold">
                      Correo electrónico
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sena-gray-dark/50" />
                        <Input
                          type="email"
                          placeholder="instructor@sena.edu.co"
                          className="pl-10 border-sena-gray-dark/20 focus-visible:ring-sena-green"
                          autoComplete="email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sena-blue font-semibold">
                      Contraseña
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sena-gray-dark/50" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 border-sena-gray-dark/20 focus-visible:ring-sena-green"
                          autoComplete="current-password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-sena-green hover:bg-sena-green-dark text-white font-bold py-6 text-base mt-2 shadow-md transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  "Ingresar al Panel"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          Solo para instructores autorizados del SENA - CEET
        </p>
      </div>
    </div>
  );
}
