import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getFichaForInstructor(fichaId: string, instructorId: string) {
  return prisma.ficha.findFirst({
    where: { id: fichaId, evaluacion: { instructorId } },
    select: {
      id: true,
      evaluacion: { select: { id: true, maxIntentos: true } },
    },
  });
}

// ─── GET: list aprendices con resultados ─────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const ficha = await getFichaForInstructor(id, session.user.instructorId);
  if (!ficha) {
    return NextResponse.json({ error: "Ficha no encontrada" }, { status: 404 });
  }

  const aprendices = await prisma.aprendiz.findMany({
    where: { fichaId: id },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  // Contar intentos por aprendiz en una sola query
  const resultados = await prisma.resultado.findMany({
    where: { fichaId: id, esPrueba: false },
    select: {
      cedula: true,
      intento: true,
      puntaje: true,
      aprobado: true,
      presentadoEn: true,
    },
    orderBy: { intento: "desc" },
  });

  const resultadosPorCedula = new Map<
    string,
    { intento: number; puntaje: number; aprobado: boolean; presentadoEn: Date }[]
  >();
  for (const r of resultados) {
    if (!resultadosPorCedula.has(r.cedula)) {
      resultadosPorCedula.set(r.cedula, []);
    }
    resultadosPorCedula.get(r.cedula)!.push(r);
  }

  const aprendicesConResultados = aprendices.map((a) => {
    const misResultados = resultadosPorCedula.get(a.cedula) ?? [];
    const ultimoResultado = misResultados[0] ?? null;
    return {
      id: a.id,
      cedula: a.cedula,
      tipoDocumento: a.tipoDocumento,
      nombres: a.nombres,
      apellidos: a.apellidos,
      email: a.email,
      emailPersonal: a.emailPersonal,
      intentosExtra: a.intentosExtra,
      intentosUsados: misResultados.length,
      intentosPermitidos: ficha.evaluacion.maxIntentos + a.intentosExtra,
      ultimoResultado: ultimoResultado
        ? {
            intento: ultimoResultado.intento,
            puntaje: ultimoResultado.puntaje,
            aprobado: ultimoResultado.aprobado,
            presentadoEn: ultimoResultado.presentadoEn.toISOString(),
          }
        : null,
    };
  });

  return NextResponse.json({
    aprendices: aprendicesConResultados,
    evaluacionMaxIntentos: ficha.evaluacion.maxIntentos,
  });
}

// ─── POST: add single or bulk ────────────────────────────────────────────────

const singleSchema = z.object({
  cedula: z.string().min(4),
  tipoDocumento: z.string().min(2).default("CC"),
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  intentosExtra: z.number().int().min(0).default(0),
});

const bulkSchema = z.object({
  mode: z.literal("bulk"),
  aprendices: z.array(
    z.object({
      cedula: z.string().min(4),
      tipoDocumento: z.string().min(2).default("CC"),
      nombres: z.string().min(1),
      apellidos: z.string().min(1),
      email: z.string().nullish(),
      emailPersonal: z.string().nullish(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const ficha = await getFichaForInstructor(id, session.user.instructorId);
  if (!ficha) {
    return NextResponse.json({ error: "Ficha no encontrada" }, { status: 404 });
  }

  const body = await req.json();

  // ── Bulk import ──
  if (body.mode === "bulk") {
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    let insertados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const ap of parsed.data.aprendices) {
      try {
        const existing = await prisma.aprendiz.findFirst({
          where: { cedula: ap.cedula, fichaId: id },
        });
        if (existing) {
          omitidos++;
          continue;
        }
        await prisma.aprendiz.create({
          data: {
            cedula: ap.cedula,
            tipoDocumento: ap.tipoDocumento || "CC",
            nombres: ap.nombres,
            apellidos: ap.apellidos,
            email: ap.email?.trim() || null,
            emailPersonal: ap.emailPersonal?.trim() || null,
            fichaId: id,
          },
        });
        insertados++;
      } catch {
        errores.push(`Error con cédula ${ap.cedula}`);
      }
    }

    return NextResponse.json({ insertados, omitidos, errores });
  }

  // ── Single add ──
  const parsed = singleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { cedula, tipoDocumento, nombres, apellidos, email, intentosExtra } =
    parsed.data;

  const existing = await prisma.aprendiz.findFirst({
    where: { cedula, fichaId: id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un aprendiz con esa cédula en esta ficha" },
      { status: 409 }
    );
  }

  const aprendiz = await prisma.aprendiz.create({
    data: {
      cedula,
      tipoDocumento,
      nombres,
      apellidos,
      email: email?.trim() || null,
      intentosExtra,
      fichaId: id,
    },
  });

  return NextResponse.json(aprendiz, { status: 201 });
}

// ─── DELETE: remove all aprendices from ficha ────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInstructor();
  const { id } = await params;

  const ficha = await getFichaForInstructor(id, session.user.instructorId);
  if (!ficha) {
    return NextResponse.json({ error: "Ficha no encontrada" }, { status: 404 });
  }

  const { count } = await prisma.aprendiz.deleteMany({ where: { fichaId: id } });

  return NextResponse.json({ eliminados: count });
}
