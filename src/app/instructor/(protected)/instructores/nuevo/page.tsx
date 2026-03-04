import { redirect } from "next/navigation";
import { requireInstructor } from "@/lib/auth-utils";
import { NuevoInstructorForm } from "@/components/templates/NuevoInstructorForm";
import { UserPlus } from "lucide-react";

export const metadata = {
  title: "Nuevo Instructor — EvalTIC Admin",
};

export default async function NuevoInstructorPage() {
  const session = await requireInstructor();

  if (!session.user.isAdmin) {
    redirect("/instructor/dashboard");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <UserPlus size={24} className="text-sena-green" />
        <div>
          <h1 className="text-2xl font-black text-sena-blue">Nuevo Instructor</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5">
            Crea un acceso para un nuevo instructor al panel.
          </p>
        </div>
      </div>

      <NuevoInstructorForm />
    </div>
  );
}
