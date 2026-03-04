import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstructor } from "@/lib/auth-utils";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const session = await requireInstructor();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
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

    const [resultados, total] = await Promise.all([
      prisma.resultado.findMany({
        where,
        include: {
          evaluacion: { select: { nombre: true } },
          ficha: { select: { numero: true, programa: true } },
        },
        orderBy: { presentadoEn: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.resultado.count({ where }),
    ]);

    return NextResponse.json({
      resultados,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
