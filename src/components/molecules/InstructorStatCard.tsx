import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InstructorStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: "green" | "blue" | "amber" | "red";
}

const colorMap = {
  green: {
    border: "border-l-sena-green",
    icon: "text-sena-green bg-sena-green/10",
    value: "text-sena-green",
  },
  blue: {
    border: "border-l-sena-blue",
    icon: "text-sena-blue bg-sena-blue/10",
    value: "text-sena-blue",
  },
  amber: {
    border: "border-l-amber-500",
    icon: "text-amber-600 bg-amber-50",
    value: "text-amber-600",
  },
  red: {
    border: "border-l-red-500",
    icon: "text-red-500 bg-red-50",
    value: "text-red-500",
  },
};

export function InstructorStatCard({
  title,
  value,
  icon: Icon,
  description,
  color = "green",
}: InstructorStatCardProps) {
  const colors = colorMap[color];

  return (
    <Card
      className={cn(
        "border-l-4 shadow-sm hover:shadow-md transition-shadow bg-white",
        colors.border
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-semibold text-sena-gray-dark/60 uppercase tracking-wide">
              {title}
            </p>
            <p className={cn("text-3xl font-black", colors.value)}>{value}</p>
            {description && (
              <p className="text-xs text-sena-gray-dark/50">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ml-4",
              colors.icon
            )}
          >
            <Icon size={22} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
