import Link from "next/link";
import { redirect } from "next/navigation";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { InstructoresTable } from "@/components/organisms/InstructoresTable";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instructores — EvalTIC Admin",
};

export default async function InstructoresPage() {
  const session = await requireInstructor();

  // Only admins can access this page
  if (!session.user.isAdmin) {
    redirect("/instructor/dashboard");
  }

  const instructores = await prisma.instructor.findMany({
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      isAdmin: true,
      creadoEn: true,
      _count: { select: { evaluaciones: true } },
    },
  });

  const serialized = instructores.map((i) => ({
    ...i,
    creadoEn: i.creadoEn.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-sena-green" />
          <div>
            <h1 className="text-2xl font-black text-sena-blue">Instructores</h1>
            <p className="text-sm text-sena-gray-dark/60 mt-0.5">
              Gestiona los accesos al panel de administración.
            </p>
          </div>
        </div>
        <Link href="/instructor/instructores/nuevo">
          <Button className="bg-sena-green hover:bg-sena-green-dark text-white font-bold gap-2 shadow-sm">
            <UserPlus size={16} />
            <span className="hidden sm:inline">Nuevo Instructor</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </Link>
      </div>

      <InstructoresTable
        instructores={serialized}
        currentInstructorId={session.user.instructorId}
      />
    </div>
  );
}
