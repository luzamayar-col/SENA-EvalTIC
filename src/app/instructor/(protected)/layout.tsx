import { InstructorSidebar } from "@/components/organisms/InstructorSidebar";
import { InstructorMobileNav } from "@/components/organisms/InstructorMobileNav";

export const metadata = {
  title: "Panel Instructor — SENA EvalTIC",
  description: "Panel de administración de evaluaciones SENA CEET",
};

export default function InstructorProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-sena-gray-light">
      {/* Sidebar desktop */}
      <InstructorSidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile top nav */}
        <InstructorMobileNav />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
