"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HelpCircle, Info, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/config";

import { HelpModal } from "./HelpModal";
import { AboutModal } from "./AboutModal";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <header className="w-full bg-sena-green text-sena-white py-3 px-4 md:px-8 border-b-4 border-sena-blue shadow-sm sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
        {/* Logo and Title (Left) */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink min-w-0">
          <Link href="/" className="flex items-center shrink-0">
            <div className="h-10 w-10 md:h-12 md:w-12 relative bg-sena-white rounded-full p-0.5 shadow-sm flex items-center justify-center">
              <Image
                src="/assets/logos/escudo-semilleros.svg"
                alt="Escudo Semilleros"
                width={50}
                height={50}
                className="w-auto h-full object-contain"
                priority
              />
            </div>
          </Link>

          <div className="hidden sm:block w-px h-8 bg-white/30 shrink-0"></div>

          <div className="flex flex-col truncate min-w-0">
            <h1 className="text-sm md:text-lg font-bold text-white leading-tight tracking-tight truncate">
              {APP_CONFIG.title}
            </h1>
            <p className="text-[10px] sm:text-xs text-white/80 hidden md:block mt-0.5 font-medium truncate">
              {APP_CONFIG.institution}
            </p>
          </div>
        </div>

        {/* Actions (Right) - Desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-medium bg-white/10 text-white/90 px-2 py-1 rounded-full mr-2 border border-white/20 select-none">
            v1.0
          </span>
          <Button
            onClick={() => setShowHelp(true)}
            variant="ghost"
            className="flex items-center gap-1.5 px-3 py-2 h-auto rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors font-medium border border-transparent"
          >
            <HelpCircle size={16} />
            <span>Ayuda</span>
          </Button>

          <Button
            onClick={() => setShowAbout(true)}
            variant="ghost"
            className="flex items-center gap-1.5 px-3 py-2 h-auto rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors font-medium border border-transparent"
          >
            <Info size={16} />
            <span>Acerca de</span>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center shrink-0">
          <button
            className="md:hidden p-2 text-white/90 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-sena-green-dark border-t border-sena-white/20 mt-3 pt-2 animate-in slide-in-from-top-2">
          <div className="space-y-1">
            <button
              onClick={() => {
                setShowHelp(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              <HelpCircle size={18} className="text-white/70" /> Ayuda
            </button>
            <button
              onClick={() => {
                setShowAbout(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              <Info size={18} className="text-white/70" /> Acerca de
            </button>
            <div className="flex items-center justify-between pt-3 pb-1 px-3 border-t border-white/20 mt-2">
              <span className="text-xs text-white/70 font-medium">
                SENA EvalTIC
              </span>
              <span className="text-[10px] font-medium bg-white/10 text-white/80 px-2 py-0.5 rounded-full border border-white/20">
                v1.0
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Help & About Modals */}
      <HelpModal open={showHelp} onOpenChange={setShowHelp} />
      <AboutModal open={showAbout} onOpenChange={setShowAbout} />
    </header>
  );
}
