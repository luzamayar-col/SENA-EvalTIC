"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { SlidersHorizontal, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ConfiguracionPage() {
  const { data: session, status } = useSession();
  const [senderEmail, setSenderEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && !session?.user?.isAdmin) {
      redirect("/instructor/dashboard");
    }
  }, [session, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.isAdmin) return;
    fetch("/api/instructor/admin/config")
      .then((r) => r.json())
      .then((data) => {
        setSenderEmail(data.senderEmail ?? "");
        setLoading(false);
      });
  }, [status, session]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/instructor/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderEmail }),
      });
      if (res.ok) {
        setFeedback({ type: "success", msg: "Configuración guardada correctamente." });
      } else {
        const err = await res.json();
        setFeedback({ type: "error", msg: err.error ?? "Error al guardar." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Error de red. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="text-sena-gray-dark/50 text-sm p-4">Cargando…</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <SlidersHorizontal size={24} className="text-sena-green" />
        <div>
          <h1 className="text-2xl font-black text-sena-blue">Configuración del sistema</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5">
            Parámetros globales de la plataforma.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-sena-gray-dark/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sena-blue text-base">Correo remitente (From)</CardTitle>
          <CardDescription className="text-xs">
            Dirección que aparece como remitente en los correos de resultados enviados a los instructores.
            En el plan gratuito de Resend solo se permite{" "}
            <code className="bg-muted px-1 rounded">onboarding@resend.dev</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="senderEmail" className="text-sm font-medium">
              Formato del remitente
            </Label>
            <Input
              id="senderEmail"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="EvalTIC SENA <onboarding@resend.dev>"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-sena-gray-dark/50 flex items-center gap-1">
              <Info size={11} />
              Formato: <code className="bg-muted px-1 rounded">Nombre visible &lt;correo@dominio.com&gt;</code>
            </p>
          </div>

          {feedback && (
            <Alert
              className={
                feedback.type === "success"
                  ? "border-sena-green/30 bg-sena-green/10 text-sena-green"
                  : "border-red-300 bg-red-50 text-red-700"
              }
            >
              <AlertDescription className="text-xs flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                {feedback.msg}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !senderEmail.trim()}
            className="bg-sena-green hover:bg-sena-green-dark text-white font-bold"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
