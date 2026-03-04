import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultadoBadgeProps {
  aprobado: boolean;
  size?: "sm" | "default";
}

export function ResultadoBadge({ aprobado, size = "default" }: ResultadoBadgeProps) {
  return (
    <Badge
      className={cn(
        "font-bold uppercase tracking-wide gap-1 border",
        aprobado
          ? "bg-sena-green/10 text-sena-green border-sena-green/30 hover:bg-sena-green/20"
          : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      )}
    >
      {aprobado ? (
        <CheckCircle2 size={size === "sm" ? 10 : 12} />
      ) : (
        <XCircle size={size === "sm" ? 10 : 12} />
      )}
      {aprobado ? "Aprobado" : "No Aprobado"}
    </Badge>
  );
}
