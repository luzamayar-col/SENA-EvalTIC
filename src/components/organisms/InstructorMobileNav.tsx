"use client";

import { useState } from "react";
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
  Menu,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/instructor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/instructor/evaluaciones", label: "Evaluaciones", icon: ClipboardList },
  { href: "/instructor/fichas", label: "Fichas", icon: Users2 },
  { href: "/instructor/resultados", label: "Resultados", icon: BarChart2 },
  { href: "/instructor/perfil", label: "Mi Perfil", icon: Settings },
];

const adminItems = [
  { href: "/instructor/instructores", label: "Instructores", icon: UserCog },
];

export function InstructorMobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "IN";

  // Derive current page title
  const currentItem = [...navItems, ...adminItems].find((item) =>
    isActive(item.href)
  );

  return (
    <header className="md:hidden flex items-center justify-between bg-sena-blue text-white px-4 py-3 border-b border-white/10 shrink-0">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
            >
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sena-blue border-r border-white/10 p-0 text-white">
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
              <div>
                <p className="text-sm font-bold text-white">EvalTIC</p>
                <p className="text-[10px] text-white/50">Panel Instructor</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-sena-green text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon size={18} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}

              {session?.user?.isAdmin && (
                <>
                  <Separator className="bg-white/10 my-3" />
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          active
                            ? "bg-sena-green text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon size={18} className="shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>

            {/* User */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-sena-green text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {session?.user?.name ?? "Instructor"}
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
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">EvalTIC</span>
          {currentItem && (
            <>
              <span className="text-white/30">/</span>
              <span className="text-sm text-white/70">{currentItem.label}</span>
            </>
          )}
        </div>
      </div>

      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-sena-green text-white text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
