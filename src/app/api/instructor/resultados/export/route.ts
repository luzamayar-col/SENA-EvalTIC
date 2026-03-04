import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireInstructor();
    const { searchParams } = new URL(req.url);

    const evaluacionId = searchParams.get("evaluacionId") ?? undefined;
    const fichaId = searchParams.get("fichaId") ?? undefined;
    const aprobadoParam = searchParams.get("aprobado");
    const aprobado =
      aprobadoParam === "true" ? true : aprobadoParam === "false" ? false : undefined;

    const where = {
      evaluacion: { instructorId: session.user.instructorId },
      ...(evaluacionId ? { evaluacionId } : {}),
      ...(fichaId ? { fichaId } : {}),
      ...(aprobado !== undefined ? { aprobado } : {}),
    };

    const resultados = await prisma.resultado.findMany({
      where,
      include: {
        evaluacion: { select: { nombre: true } },
        ficha: { select: { numero: true, programa: true } },
      },
      orderBy: { presentadoEn: "desc" },
    });

    // Build CSV with BOM for Excel UTF-8 compatibility
    const headers = [
      "cedula",
      "tipoDocumento",
      "nombres",
      "apellidos",
      "email",
      "ficha",
      "programa",
      "evaluacion",
      "puntaje",
      "aprobado",
      "preguntasCorrectas",
      "totalPreguntas",
      "tiempoMinutos",
      "presentadoEn",
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
      r.puntaje,
      r.aprobado ? "SI" : "NO",
      r.preguntasCorrectas,
      r.totalPreguntas,
      (r.tiempoUsado / 60).toFixed(1),
      new Date(r.presentadoEn).toLocaleString("es-CO"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    // BOM for Excel
    const BOM = "\uFEFF";
    const csv = BOM + csvContent;

    const filename = `resultados-${Date.now()}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
