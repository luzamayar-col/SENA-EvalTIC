import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/organisms/Header";
import { Footer } from "@/components/organisms/Footer";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SENA EvalTIC - Evaluación en Línea",
  description:
    "Plataforma de evaluación en línea del Servicio Nacional de Aprendizaje SENA - CEET",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${workSans.variable} antialiased min-h-screen flex flex-col font-sans`}
      >
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full bg-sena-gray-light/30">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
