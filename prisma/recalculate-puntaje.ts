/**
 * One-time migration: recalculate puntaje and preguntasCorrectas for all
 * existing Resultado records using the current partial-credit scoring logic.
 *
 * Run with:
 *   npx tsx prisma/recalculate-puntaje.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { calcularPuntaje } from "../src/lib/score";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Respuestas = Record<string, any>;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definido en .env.local");
}
const adapter = new PrismaNeonHttp(process.env.DATABASE_URL, {});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const DEFAULT_PASSING_SCORE = 65;

async function main() {
  // Load all results with their evaluacion (preguntas + config)
  const resultados = await prisma.resultado.findMany({
    include: {
      evaluacion: {
        select: { preguntas: true, config: true },
      },
    },
  });

  console.log(`Found ${resultados.length} records to recalculate.`);

  let updated = 0;
  let skipped = 0;

  for (const r of resultados) {
    const respuestas = r.respuestas as Respuestas;
    const idsRespondidos = Object.keys(respuestas);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todasPreguntas = r.evaluacion.preguntas as any[];
    const preguntasEvaluadas = todasPreguntas.filter((q) =>
      idsRespondidos.includes(String(q.id)),
    );

    if (preguntasEvaluadas.length === 0) {
      console.log(`  SKIP  id=${r.id} (no matching questions)`);
      skipped++;
      continue;
    }

    const passingScore =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r.evaluacion.config as any)?.passingScorePercentage ?? DEFAULT_PASSING_SCORE;

    const resultado = calcularPuntaje(preguntasEvaluadas, respuestas, passingScore);

    const oldPuntaje = r.puntaje;
    const newPuntaje = resultado.puntajeTotal;
    const newCorrectas = resultado.preguntasCorrectas;
    const newAprobado = resultado.aprobado;

    if (oldPuntaje === newPuntaje && r.preguntasCorrectas === newCorrectas) {
      skipped++;
      continue;
    }

    await prisma.resultado.update({
      where: { id: r.id },
      data: {
        puntaje: newPuntaje,
        preguntasCorrectas: newCorrectas,
        aprobado: newAprobado,
      },
    });

    console.log(
      `  UPDATE id=${r.id} cedula=${r.cedula} ` +
        `puntaje ${oldPuntaje} → ${newPuntaje} ` +
        `correctas ${r.preguntasCorrectas} → ${newCorrectas} ` +
        `aprobado=${newAprobado}`,
    );
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
