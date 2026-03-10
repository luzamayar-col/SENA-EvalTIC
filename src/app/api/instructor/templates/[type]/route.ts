import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await requireInstructor();
  const { type } = await params;

  // ── Plantilla de aprendices (.xlsx) ───────────────────────────────────────
  if (type === "aprendices") {
    const XLSX = await import("xlsx");

    const templateData = [
      ["tipoDocumento", "cedula", "nombres", "apellidos", "email"],
      ["CC", "1020304050", "Juan Carlos", "Pérez Gómez", "jcperez@soy.sena.edu.co"],
      ["TI", "1000123456", "María Alejandra", "González Ruiz", ""],
      ["CE", "987654321", "Luis Fernando", "Martínez Díaz", "lmartinez@gmail.com"],
    ];

    const ws = (XLSX as any).utils.aoa_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
    ];

    const wb = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(wb, ws, "Aprendices");

    const buf = (XLSX as any).write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla-aprendices.xlsx"',
      },
    });
  }

  // ── Plantilla de preguntas (.json) ────────────────────────────────────────
  if (type === "preguntas") {
    const template = {
      preguntas: [
        {
          id: "p1",
          tipo: "seleccion_unica",
          texto: "¿Cuál es el principal objetivo del modelo OSI?",
          opciones: [
            { id: "a", texto: "Estandarizar las comunicaciones en red" },
            { id: "b", texto: "Proveer acceso a Internet" },
            { id: "c", texto: "Administrar direcciones IP" },
            { id: "d", texto: "Gestionar contraseñas" },
          ],
          respuestaCorrecta: "a",
          retroalimentacion:
            "El modelo OSI define un marco estándar para las comunicaciones en red dividido en 7 capas.",
        },
        {
          id: "p2",
          tipo: "seleccion_multiple",
          texto: "¿Cuáles de los siguientes son protocolos de capa de transporte?",
          opciones: [
            { id: "a", texto: "TCP" },
            { id: "b", texto: "HTTP" },
            { id: "c", texto: "UDP" },
            { id: "d", texto: "FTP" },
          ],
          respuestaCorrecta: ["a", "c"],
          retroalimentacion:
            "TCP y UDP operan en la capa de transporte. HTTP y FTP operan en la capa de aplicación.",
        },
        {
          id: "p3",
          tipo: "emparejamiento",
          texto: "Relaciona cada capa del modelo OSI con su función principal:",
          pares: [
            { izquierda: "Capa Física", derecha: "Transmisión de bits por el medio" },
            { izquierda: "Capa de Red", derecha: "Enrutamiento de paquetes" },
            {
              izquierda: "Capa de Transporte",
              derecha: "Control de flujo extremo a extremo",
            },
            {
              izquierda: "Capa de Aplicación",
              derecha: "Interfaz con las aplicaciones del usuario",
            },
          ],
          retroalimentacion:
            "Cada capa del modelo OSI tiene una responsabilidad bien definida en el proceso de comunicación.",
        },
      ],
    };

    return new NextResponse(JSON.stringify(template, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="plantilla-preguntas.json"',
      },
    });
  }

  return NextResponse.json({ error: "Tipo de plantilla no válido" }, { status: 400 });
}
