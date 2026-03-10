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

const PAGE_SIZE = 20;

export default async function InstructoresPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireInstructor();

  // Only admins can access this page
  if (!session.user.isAdmin) {
    redirect("/instructor/dashboard");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [instructores, total] = await Promise.all([
    prisma.instructor.findMany({
      orderBy: { creadoEn: "asc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        nombre: true,
        email: true,
        isAdmin: true,
        creadoEn: true,
        _count: { select: { evaluaciones: true } },
      },
    }),
    prisma.instructor.count(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
              Gestiona los accesos al panel de administración.{" "}
              <span className="font-semibold">{total}</span> en total.
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
        pagination={{ page, totalPages }}
      />
    </div>
  );
}
