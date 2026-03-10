"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  ClipboardList,
  Users2,
  BarChart2,
  LogOut,
  UserCog,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    href: "/instructor/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/instructor/evaluaciones",
    label: "Evaluaciones",
    icon: ClipboardList,
  },
  {
    href: "/instructor/fichas",
    label: "Fichas",
    icon: Users2,
  },
  {
    href: "/instructor/resultados",
    label: "Resultados",
    icon: BarChart2,
  },
  {
    href: "/instructor/perfil",
    label: "Mi Perfil",
    icon: Settings,
  },
];

const adminItems = [
  {
    href: "/instructor/instructores",
    label: "Instructores",
    icon: UserCog,
  },
];

export function InstructorSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "IN";

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sena-blue text-white h-full overflow-y-auto">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <Image
            src="/assets/logos/escudo-semilleros.svg"
            alt="SENA"
            width={24}
            height={24}
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">EvalTIC</p>
          <p className="text-[10px] text-white/50 truncate">Panel Instructor</p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-2 mb-2">
          Menú principal
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-sena-green text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-white" : "text-white/50 group-hover:text-white"
                )}
              />
              <span className="truncate">{item.label}</span>
              {active && (
                <ChevronRight size={14} className="ml-auto text-white/70" />
              )}
            </Link>
          );
        })}

        {/* Admin section (solo isAdmin) */}
        {session?.user?.isAdmin && (
          <>
            <Separator className="bg-white/10 my-3" />
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-2 mb-2">
              Administración
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    active
                      ? "bg-sena-green text-white shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      "shrink-0 transition-colors",
                      active
                        ? "text-white"
                        : "text-white/50 group-hover:text-white"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <ChevronRight size={14} className="ml-auto text-white/70" />
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0 bg-sena-green text-white">
            <AvatarFallback className="bg-sena-green text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {session?.user?.name ?? "Instructor"}
            </p>
            <p className="text-[10px] text-white/50 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/instructor/login" })}
          className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10 text-xs gap-2 px-2"
        >
          <LogOut size={14} />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
