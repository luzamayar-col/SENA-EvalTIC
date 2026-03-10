import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const preguntasData = require("../src/data/preguntas.json");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definido en .env.local");
}
const adapter = new PrismaNeonHttp(process.env.DATABASE_URL, {});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const seedPassword = process.env.INSTRUCTOR_SEED_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      "❌ INSTRUCTOR_SEED_PASSWORD no está definido en .env.local\n" +
        "   Agrega: INSTRUCTOR_SEED_PASSWORD=tu-contraseña-segura"
    );
  }

  const hashedPassword = await bcrypt.hash(seedPassword, 12);

  // findFirst + create evita upsert (que usa transacciones, no soportadas en HTTP mode)
  let instructor = await prisma.instructor.findFirst({
    where: { email: "mvargasr@sena.edu.co" },
  });
  if (!instructor) {
    instructor = await prisma.instructor.create({
      data: {
        email: "mvargasr@sena.edu.co",
        nombre: "Mauricio Alexander Vargas Rodríguez",
        password: hashedPassword,
        isAdmin: true,
      },
    });
  }

  let evaluacion = await prisma.evaluacion.findFirst({
    where: { id: "seed-evaluacion-001" },
  });
  if (!evaluacion) {
    evaluacion = await prisma.evaluacion.create({
      data: {
        id: "seed-evaluacion-001",
        nombre: "Investigación Formativa — Competencia 38199",
        descripcion:
          "Evaluación de conocimientos sobre investigación formativa según referentes técnicos del SENA",
        competencia:
          "ORIENTAR INVESTIGACIÓN FORMATIVA SEGÚN REFERENTES TÉCNICOS",
        codigoCompetencia: "38199",
        resultadoAprendizaje:
          "PROPONER SOLUCIONES A LAS NECESIDADES DEL CONTEXTO SEGÚN RESULTADOS DE LA INVESTIGACIÓN",
        codigoRA: "580873",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preguntas: preguntasData.preguntas as any,
        activa: true,
        config: {
          timeLimitMinutes: 15,
          passingScorePercentage: 65,
          distribucionPreguntas: {
            seleccion_unica: 5,
            seleccion_multiple: 3,
            emparejamiento: 2,
          },
          aleatorizarOpciones: true,
        },
        instructorId: instructor.id,
      },
    });
  }

  const fichaExiste = await prisma.ficha.findFirst({
    where: { id: "seed-ficha-001" },
  });
  if (!fichaExiste) {
    await prisma.ficha.create({
      data: {
        id: "seed-ficha-001",
        numero: "2501234",
        programa:
          "Tecnólogo en Implementación de Infraestructura de Tecnologías de la Información y las Comunicaciones",
        descripcion: "Ficha de ejemplo creada por el seed",
        evaluacionId: evaluacion.id,
      },
    });
  }

  // Seed AppConfig defaults (idempotent)
  const senderEmailExiste = await prisma.appConfig.findFirst({
    where: { clave: "senderEmail" },
  });
  if (!senderEmailExiste) {
    await prisma.appConfig.create({
      data: { clave: "senderEmail", valor: "EvalTIC SENA <onboarding@resend.dev>" },
    });
  }

  console.log("\n✅ Seed completado exitosamente");
  console.log("──────────────────────────────────────");
  console.log("  Instructor:", instructor.email);
  console.log("  Contraseña: [valor de INSTRUCTOR_SEED_PASSWORD]");
  console.log("  Admin:", instructor.isAdmin);
  console.log("  Evaluación:", evaluacion.nombre);
  console.log("  Ficha de ejemplo: 2501234");
  console.log("──────────────────────────────────────");
  console.log("  → Inicia sesión en /instructor/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
