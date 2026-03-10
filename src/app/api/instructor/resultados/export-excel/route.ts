import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireInstructor();
  const { searchParams } = new URL(req.url);

  const evaluacionId = searchParams.get("evaluacionId") ?? undefined;
  const fichaId = searchParams.get("fichaId") ?? undefined;
  const aprobadoParam = searchParams.get("aprobado");
  const aprobado =
    aprobadoParam === "true" ? true : aprobadoParam === "false" ? false : undefined;

  const resultados = await prisma.resultado.findMany({
    where: {
      esPrueba: false,
      ...(evaluacionId ? { evaluacionId } : {}),
      ...(fichaId ? { fichaId } : {}),
      ...(aprobado !== undefined ? { aprobado } : {}),
      evaluacion: { instructorId: session.user.instructorId },
    },
    include: {
      ficha: { select: { numero: true, programa: true } },
      evaluacion: { select: { nombre: true } },
    },
    orderBy: { presentadoEn: "desc" },
  });

  const totalPresentaciones = resultados.length;
  const aprobados = resultados.filter((r) => r.aprobado).length;
  const tasaAprobacion =
    totalPresentaciones > 0
      ? Math.round((aprobados / totalPresentaciones) * 100)
      : 0;
  const promedioPuntaje =
    totalPresentaciones > 0
      ? Math.round(resultados.reduce((acc, r) => acc + r.puntaje, 0) / totalPresentaciones)
      : 0;

  const XLSX = await import("xlsx");

  // ── Hoja 1: Resultados ────────────────────────────────────────────────────
  const headers = [
    "Cédula",
    "Tipo Doc",
    "Nombres",
    "Apellidos",
    "Email",
    "Ficha",
    "Programa",
    "Evaluación",
    "Intento",
    "Puntaje (%)",
    "Aprobado",
    "Correctas",
    "Total Preg.",
    "Tiempo (min)",
    "Fecha",
  ];

  const rows = resultados.map((r) => [
    r.cedula,
    r.tipoDocumento,
    r.nombres,
    r.apellidos,
    r.email,
    r.ficha.numero,
    r.ficha.programa,
    r.evaluacion.nombre,
    r.intento,
    r.puntaje,
    r.aprobado ? "SI" : "NO",
    r.preguntasCorrectas,
    r.totalPreguntas,
    (r.tiempoUsado / 60).toFixed(1),
    new Date(r.presentadoEn).toLocaleString("es-CO"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 28 },
    { wch: 10 }, { wch: 40 }, { wch: 40 }, { wch: 8 },  { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 22 },
  ];

  // ── Hoja 2: Resumen ───────────────────────────────────────────────────────
  const summaryData = [
    ["Métrica", "Valor"],
    ["Total presentaciones", totalPresentaciones],
    ["Aprobados", aprobados],
    ["No aprobados", totalPresentaciones - aprobados],
    ["Tasa aprobación", `${tasaAprobacion}%`],
    ["Promedio puntaje", `${promedioPuntaje}%`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = (XLSX as any).write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
  // Convert to ArrayBuffer for NextResponse compatibility
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="resultados-${Date.now()}.xlsx"`,
    },
  });
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    return NextResponse.json({ error: "Error al generar el archivo Excel" }, { status: 500 });
  }
}
