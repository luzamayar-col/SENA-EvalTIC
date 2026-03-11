import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "@cantoo/pdf-lib";
import { APP_CONFIG } from "./config";
import { EvaluacionResultado, calcularCreditoPregunta } from "./score";
import { DatosAprendiz, RespuestaAprendiz } from "@/stores/evaluacion-store";
import { fmtScore } from "./utils";

// PAGE LAYOUT - Letter 8.5x11 in
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 17.78;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_ZONE = PAGE_H - 22;
// Y where content starts after the header (logo 14mm @y14 + separator @y32 + gap 6 = 38)
const HEADER_BOTTOM = 38;

// SENA institutional colours
const SENA_GREEN: [number, number, number] = [57, 169, 0];
const SENA_BLUE: [number, number, number] = [0, 50, 77];
const GRAY: [number, number, number] = [128, 128, 128];
const GRAY_LIGHT: [number, number, number] = [245, 245, 245];
const BLACK: [number, number, number] = [0, 0, 0];
const RED: [number, number, number] = [220, 38, 38];
const WHITE: [number, number, number] = [255, 255, 255];
const AMBER: [number, number, number] = [245, 158, 11];

// ---------------------------------------------------------------------------
// ASSET CACHE
// ---------------------------------------------------------------------------
let logoData: string | null = null;
let fontRegB64: string | null | undefined = undefined; // undefined=not tried, null=failed

// Local font (served from /public/fonts/) — no CDN dependency
const FONT_REG = "/fonts/NotoSans-Regular.ttf";
const FONT_NAME = "NotoSans";

// NFC-normalize text to avoid decomposed Unicode causing spaced-out glyphs
function n(s: string): string {
  return (s ?? "").normalize("NFC");
}

async function fetchB64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  } catch {
    return null;
  }
}

async function loadImage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function ensureAssets() {
  const tasks: Promise<void>[] = [];
  if (!logoData)
    tasks.push(
      loadImage("/assets/logos/logo-sena.png").then((d) => {
        logoData = d;
      }),
    );
  if (fontRegB64 === undefined)
    tasks.push(
      fetchB64(FONT_REG).then((d) => {
        fontRegB64 = d;
      }),
    );
  await Promise.all(tasks);
}

function registerFonts(doc: jsPDF): string {
  if (fontRegB64) {
    // Register the same (validated) Regular TTF for both weights.
    // A proper Bold file could not be obtained; labels still render in
    // correct encoding. Swap in NotoSans-Bold.ttf whenever available.
    doc.addFileToVFS("NotoSans-Regular.ttf", fontRegB64);
    doc.addFont("NotoSans-Regular.ttf", FONT_NAME, "normal");
    doc.addFileToVFS("NotoSans-Bold.ttf", fontRegB64);
    doc.addFont("NotoSans-Bold.ttf", FONT_NAME, "bold");
    doc.addFileToVFS("NotoSans-Italic.ttf", fontRegB64);
    doc.addFont("NotoSans-Italic.ttf", FONT_NAME, "italic");
  }
  return fontRegB64 ? FONT_NAME : "helvetica";
}

// ---------------------------------------------------------------------------
// SHORTHAND HELPERS
// ---------------------------------------------------------------------------
function tc(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function fc(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function dc(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

// ---------------------------------------------------------------------------
// HEADER / FOOTER
// ---------------------------------------------------------------------------
function addHeader(doc: jsPDF, dateStr: string, font: string): number {
  const lH = 14;
  const lY = 14;
  if (logoData) {
    doc.addImage(logoData, "PNG", MARGIN, lY, CONTENT_W * 0.55, lH);
  }
  doc.setFontSize(8);
  doc.setFont(font, "normal");
  tc(doc, GRAY);
  doc.text("Bogota D.C., " + dateStr, PAGE_W - MARGIN, lY + lH, {
    align: "right",
  });
  const lineY = lY + lH + 4;
  dc(doc, SENA_BLUE);
  doc.setLineWidth(0.5 * 0.352778);
  doc.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);
  return lineY + 6;
}

function addFooter(doc: jsPDF, font: string) {
  const y = PAGE_H - 14;
  dc(doc, SENA_BLUE);
  doc.setLineWidth(0.3 * 0.352778);
  doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
  doc.setFontSize(8);
  doc.setFont(font, "normal");
  tc(doc, SENA_BLUE);
  doc.text(APP_CONFIG.institution, MARGIN, y + 2);
  fc(doc, SENA_GREEN);
  doc.rect(0, PAGE_H - 5, PAGE_W, 5, "F");
}

// ---------------------------------------------------------------------------
// WATERMARK
// ---------------------------------------------------------------------------
function addWatermark(doc: jsPDF, text: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 50, 77);
  // Staggered grid: even rows at 25%/75%, odd rows at 50% — covers the full page
  const rowSpacing = 45;
  let row = 0;
  for (let y = 28; y < ph - 10; y += rowSpacing) {
    const xs = row % 2 === 0 ? [pw * 0.25, pw * 0.75] : [pw * 0.5];
    for (const x of xs) {
      doc.text(text, x, y, { angle: 45, align: "center" });
    }
    row++;
  }
  doc.restoreGraphicsState();
}

// ---------------------------------------------------------------------------
// PAGE CONTEXT & HELPERS
// ---------------------------------------------------------------------------
interface Ctx {
  doc: jsPDF;
  y: number;
  dateStr: string;
  font: string;
  watermarkText?: string;
}

function checkPage(ctx: Ctx, need: number): number {
  if (ctx.y + need > FOOTER_ZONE) {
    addFooter(ctx.doc, ctx.font);
    ctx.doc.addPage();
    ctx.y = addHeader(ctx.doc, ctx.dateStr, ctx.font);
    if (ctx.watermarkText) addWatermark(ctx.doc, ctx.watermarkText);
  }
  return ctx.y;
}

function wrapText(
  ctx: Ctx,
  text: string,
  x: number,
  maxW: number,
  lh: number,
): number {
  const lines = ctx.doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    ctx.y = checkPage(ctx, lh + 2);
    ctx.doc.text(line, x, ctx.y);
    ctx.y += lh;
  }
  return ctx.y;
}

// Type helper for autoTable lastAutoTable
type DocWithTable = { lastAutoTable: { finalY: number } };

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------
export async function generatePDF(
  datosAprendiz: DatosAprendiz,
  resultado: EvaluacionResultado,
  tiempoTranscurrido: number,
  preguntasSeleccionadas: unknown[],
  respuestas: Record<string, RespuestaAprendiz>,
  incidenciasAntiplagio?: number,
  umbralAntiplagio?: { medio: number; alto: number },
) {
  await ensureAssets();
  const umbralMedio = umbralAntiplagio?.medio ?? 3;
  const umbralAlto = umbralAntiplagio?.alto ?? 6;

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const font = registerFonts(doc);

  const dateStr = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const evalDateStr = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const evalDateLabel =
    evalDateStr.charAt(0).toUpperCase() + evalDateStr.slice(1);

  const watermarkText = `${n(datosAprendiz.nombres)} ${n(datosAprendiz.apellidos)} · ${n(datosAprendiz.tipoDocumento)}: ${n(datosAprendiz.numeroDocumento)}`;

  // PDF metadata for identification if shared
  doc.setProperties({
    title: `Informe de Evaluación — ${n(datosAprendiz.nombres)} ${n(datosAprendiz.apellidos)}`,
    author: "SENA EvalTIC",
    subject: `${n(datosAprendiz.tipoDocumento)}: ${n(datosAprendiz.numeroDocumento)} | Ficha: ${n(datosAprendiz.ficha)}`,
    creator: "SENA EvalTIC — Sistema de Evaluación",
    keywords: `${n(datosAprendiz.numeroDocumento)}, ${n(datosAprendiz.nombres)}, ${n(datosAprendiz.apellidos)}, SENA`,
  });

  const ctx: Ctx = { doc, y: 0, dateStr, font, watermarkText };
  const tbl = (styles: object) => ({
    ...styles,
    font: font !== "helvetica" ? font : undefined,
  });

  // =========================================================================
  // PAGE 1 SUMMARY
  // =========================================================================
  ctx.y = addHeader(doc, dateStr, font);
  addWatermark(doc, watermarkText);

  // Report title
  doc.setFontSize(16);
  doc.setFont(font, "bold");
  tc(doc, SENA_BLUE);
  doc.text("Informe de Evaluación de Conocimientos", PAGE_W / 2, ctx.y, {
    align: "center",
  });
  ctx.y += 8;

  // ---- 1. Datos del Aprendiz ----
  doc.setFontSize(12);
  doc.setFont(font, "bold");
  tc(doc, SENA_GREEN);
  doc.text("1. Datos del Aprendiz", MARGIN, ctx.y);
  ctx.y += 6;

  const progLines = doc.splitTextToSize(
    datosAprendiz.programaFormacion,
    CONTENT_W - 55,
  ) as string[];
  // top(7) + Aprendiz(6) + Documento(6) + Correo(6) + programa lines + Ficha(6) + 3mm bottom gap
  const boxH = 7 + 6 + 6 + 6 + progLines.length * 5 + 6 + 3;
  fc(doc, GRAY_LIGHT);
  doc.rect(MARGIN, ctx.y, CONTENT_W, boxH, "F");

  const lx = MARGIN + 5;
  const lvx = MARGIN + 38;
  doc.setFontSize(9);
  let by = ctx.y + 7;

  const rowSingle = (label: string, value: string) => {
    doc.setFont(font, "bold");
    tc(doc, SENA_BLUE);
    doc.text(label, lx, by);
    doc.setFont(font, "normal");
    tc(doc, BLACK);
    doc.text(value, lvx, by);
    by += 6;
  };

  rowSingle(
    "Aprendiz:",
    n(datosAprendiz.nombres) + " " + n(datosAprendiz.apellidos),
  );
  rowSingle(
    "Documento:",
    n(datosAprendiz.tipoDocumento) + " " + n(datosAprendiz.numeroDocumento),
  );
  rowSingle("Correo:", n(datosAprendiz.correo));

  // Programa (multi-line)
  doc.setFont(font, "bold");
  tc(doc, SENA_BLUE);
  doc.text("Programa:", lx, by);
  doc.setFont(font, "normal");
  tc(doc, BLACK);
  progLines.forEach((l: string, i: number) => doc.text(n(l), lvx, by + i * 5));
  by += progLines.length * 5;

  rowSingle("Ficha:", n(datosAprendiz.ficha));

  // Fecha de evaluacion
  doc.setFont(font, "bold");
  tc(doc, SENA_BLUE);
  doc.text("Fecha:", lx, by);
  doc.setFont(font, "normal");
  tc(doc, BLACK);
  doc.text(n(evalDateLabel), lvx, by);

  ctx.y += boxH + 8;

  // ---- 2. Competencia y Resultado de Aprendizaje ----
  ctx.y = checkPage(ctx, 30);
  doc.setFontSize(12);
  doc.setFont(font, "bold");
  tc(doc, SENA_GREEN);
  doc.text(
    "2. Competencia y Resultado de Aprendizaje Evaluados",
    MARGIN,
    ctx.y,
  );
  ctx.y += 6;

  autoTable(doc, {
    startY: ctx.y,
    head: [["Campo", "Código", "Descripción"]],
    body: [
      [
        "Competencia",
        APP_CONFIG.competencia.codigo,
        APP_CONFIG.competencia.nombre,
      ],
      [
        "Resultado de Aprendizaje",
        APP_CONFIG.resultadoAprendizaje.codigo,
        APP_CONFIG.resultadoAprendizaje.nombre,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: SENA_BLUE,
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      ...tbl({}),
    },
    bodyStyles: { textColor: 50, fontSize: 8, ...tbl({}) },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: CONTENT_W - 67 },
    },
    margin: { top: HEADER_BOTTOM, left: MARGIN, right: MARGIN, bottom: 22 },
    didDrawPage: (data) => {
      addFooter(doc, font);
      if (data.pageNumber > 1) { addHeader(doc, dateStr, font); addWatermark(doc, watermarkText); }
    },
  });
  ctx.y = (doc as unknown as DocWithTable).lastAutoTable.finalY + 8;

  // ---- 3. Resultados ----
  ctx.y = checkPage(ctx, 50);
  doc.setFontSize(12);
  doc.setFont(font, "bold");
  tc(doc, SENA_GREEN);
  doc.text("3. Resultados de la Evaluación", MARGIN, ctx.y);
  ctx.y += 6;

  const mns = Math.floor(tiempoTranscurrido / 60);
  const scs = tiempoTranscurrido % 60;

  autoTable(doc, {
    startY: ctx.y,
    head: [["Ítem", "Detalle"]],
    body: [
      ["Puntaje Obtenido", fmtScore(resultado.puntajeTotal) + " / 100"],
      ["Estado", resultado.aprobado ? "APROBADO" : "NO APROBADO"],
      [
        "Respuestas Correctas",
        resultado.preguntasParciales > 0
          ? `${resultado.preguntasCorrectas} completas, ${resultado.preguntasParciales} parciales de ${resultado.totalPreguntas}`
          : `${resultado.preguntasCorrectas} de ${resultado.totalPreguntas}`,
      ],
      ["Tiempo Empleado", mns + " min " + scs + " seg"],
      ...(incidenciasAntiplagio !== undefined ? [[
        "Incidencias Antiplagio",
        incidenciasAntiplagio === 0
          ? "Sin incidencias"
          : incidenciasAntiplagio < umbralMedio
          ? `Nivel Bajo — ${incidenciasAntiplagio} incidencia${incidenciasAntiplagio > 1 ? "s" : ""} detectada${incidenciasAntiplagio > 1 ? "s" : ""}`
          : incidenciasAntiplagio < umbralAlto
          ? `Nivel Medio — ${incidenciasAntiplagio} incidencias detectadas`
          : `Nivel Alto — ${incidenciasAntiplagio} incidencias detectadas`,
      ]] : []),
    ],
    theme: "grid",
    headStyles: {
      fillColor: SENA_BLUE,
      textColor: 255,
      fontSize: 9,
      halign: "center",
      ...tbl({}),
    },
    bodyStyles: { textColor: 50, fontSize: 9, ...tbl({}) },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: CONTENT_W * 0.5 },
      1: { cellWidth: CONTENT_W * 0.5, halign: "center" },
    },
    margin: { top: HEADER_BOTTOM, left: MARGIN, right: MARGIN, bottom: 22 },
    didParseCell: (data) => {
      if (incidenciasAntiplagio !== undefined && data.row.index === 4) {
        // Row 4 = Incidencias Antiplagio row (0-based: Puntaje, Estado, Correctas, Tiempo, Incidencias)
        const c = incidenciasAntiplagio === 0 ? [220, 252, 231]
          : incidenciasAntiplagio < umbralMedio ? [254, 243, 199]
          : incidenciasAntiplagio < umbralAlto ? [255, 237, 213]
          : [254, 226, 226];
        data.cell.styles.fillColor = c as [number, number, number];
        if (data.column.index === 1) {
          data.cell.styles.textColor =
            incidenciasAntiplagio === 0 ? [22, 101, 52]
            : incidenciasAntiplagio < umbralMedio ? [120, 53, 15]
            : incidenciasAntiplagio < umbralAlto ? [154, 52, 18]
            : [153, 27, 27] as [number, number, number];
        }
      }
    },
    didDrawPage: (data) => {
      addFooter(doc, font);
      if (data.pageNumber > 1) { addHeader(doc, dateStr, font); addWatermark(doc, watermarkText); }
    },
  });
  ctx.y = (doc as unknown as DocWithTable).lastAutoTable.finalY + 8;

  // Define question structure — used in sections 4 and 5
  type Pregunta = {
    id: number | string;
    tipo: string;
    enunciado: string;
    tema?: string;
    opciones?: Array<{ id: string; texto: string }>;
    pares?: Array<{ izquierda: string; derecha: string }>;
    respuestaCorrecta?: string[];
    retroalimentacion?: string;
  };

  const preguntas = preguntasSeleccionadas as Pregunta[];

  // Build retroalimentación map by theme (deduplicated)
  const retroByTema: Record<string, string[]> = {};
  preguntas.forEach((q) => {
    const tema = q.tema || "General";
    if (q.retroalimentacion && q.retroalimentacion.trim()) {
      if (!retroByTema[tema]) retroByTema[tema] = [];
      if (!retroByTema[tema].includes(q.retroalimentacion)) {
        retroByTema[tema].push(q.retroalimentacion);
      }
    }
  });

  // ---- 4. Desempeño por Área Temática (página aparte) ----
  if (
    resultado.puntajePorTema &&
    Object.keys(resultado.puntajePorTema).length > 0
  ) {
    // Always open a fresh page for this section
    addFooter(doc, font);
    doc.addPage();
    ctx.y = addHeader(doc, dateStr, font);
    addWatermark(doc, watermarkText);

    doc.setFontSize(14);
    doc.setFont(font, "bold");
    tc(doc, SENA_BLUE);
    doc.text("4. Desempeño por Área Temática", MARGIN, ctx.y);
    ctx.y += 8;

    const temas = Object.keys(resultado.puntajePorTema);

    autoTable(doc, {
      startY: ctx.y,
      head: [["Área Temática", "Efectividad", "Nivel de Desempeño"]],
      body: temas.map((t) => {
        const pct = Math.round(resultado.puntajePorTema![t]);
        const nivel =
          pct >= 65
            ? "Satisfactorio"
            : pct >= 40
              ? "En proceso"
              : "Por mejorar";
        return [n(t), pct + "%", nivel];
      }),
      theme: "striped",
      headStyles: {
        fillColor: SENA_GREEN,
        textColor: 255,
        fontSize: 9,
        halign: "center",
        fontStyle: "bold",
        ...tbl({}),
      },
      bodyStyles: { fontSize: 9, ...tbl({}) },
      columnStyles: {
        0: { cellWidth: CONTENT_W - 70 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 40, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 2) return;
        const pct = parseInt(
          (data.row.raw as string[])[1].replace("%", ""),
          10,
        );
        if (pct >= 65) data.cell.styles.textColor = SENA_GREEN;
        else if (pct >= 40) data.cell.styles.textColor = AMBER;
        else data.cell.styles.textColor = RED;
        data.cell.styles.fontStyle = "bold";
      },
      margin: { top: HEADER_BOTTOM, left: MARGIN, right: MARGIN, bottom: 22 },
      didDrawPage: (data) => {
        addFooter(doc, font);
        if (data.pageNumber > 1) { addHeader(doc, dateStr, font); addWatermark(doc, watermarkText); }
      },
    });
    ctx.y = (doc as unknown as DocWithTable).lastAutoTable.finalY + 10;

    // ---- Recomendaciones ----
    ctx.y = checkPage(ctx, 20);
    doc.setFontSize(12);
    doc.setFont(font, "bold");
    tc(doc, SENA_BLUE);
    doc.text("Recomendaciones por Área Temática", MARGIN, ctx.y);
    ctx.y += 8;

    temas.forEach((tema, tIdx) => {
      const pct = Math.round(resultado.puntajePorTema![tema]);
      const retros = retroByTema[tema] || [];

      ctx.y = checkPage(ctx, 22);

      // Colored bullet + theme title
      const nivelColor: [number, number, number] =
        pct >= 65 ? SENA_GREEN : pct >= 40 ? AMBER : RED;
      const nivelTexto =
        pct >= 65 ? "Satisfactorio" : pct >= 40 ? "En proceso" : "Por mejorar";

      doc.setFontSize(10);
      doc.setFont(font, "bold");
      fc(doc, nivelColor);
      doc.circle(MARGIN + 2, ctx.y - 1.5, 1.8, "F");
      tc(doc, SENA_BLUE);
      doc.text(`${n(tema)}  (${pct}% - ${nivelTexto})`, MARGIN + 6, ctx.y);
      ctx.y += 5;

      // General recommendation based on performance level
      doc.setFontSize(9);
      doc.setFont(font, "normal");
      tc(doc, BLACK);
      let recoText: string;
      if (pct >= 65) {
        recoText =
          "Buen nivel de dominio en esta area. Se recomienda continuar fortaleciendo y aplicando estos conocimientos en contextos practicos.";
      } else if (pct >= 40) {
        recoText =
          "Los conocimientos de esta area estan en proceso de consolidacion. Se sugiere revisar los contenidos y practicar con ejercicios adicionales para afianzar el aprendizaje.";
      } else {
        recoText =
          "Esta area requiere atencion prioritaria. Se recomienda un estudio detallado de los contenidos, el uso de materiales de apoyo y solicitar orientacion al instructor.";
      }
      ctx.y = checkPage(ctx, 8);
      ctx.y = wrapText(ctx, recoText, MARGIN + 4, CONTENT_W - 8, 5);

      // Retroalimentaciones from the questions of this theme as specific guidance
      if (retros.length > 0) {
        ctx.y = checkPage(ctx, 8);
        doc.setFont(font, "bold");
        tc(doc, SENA_BLUE);
        doc.setFontSize(8.5);
        doc.text("Aspectos clave a recordar:", MARGIN + 4, ctx.y);
        ctx.y += 5;
        doc.setFont(font, "italic");
        tc(doc, GRAY);
        doc.setFontSize(8);
        retros.forEach((retro) => {
          ctx.y = checkPage(ctx, 8);
          ctx.y = wrapText(
            ctx,
            "- " + n(retro),
            MARGIN + 6,
            CONTENT_W - 10,
            4.5,
          );
          ctx.y += 2;
        });
      }

      if (tIdx < temas.length - 1) {
        ctx.y += 3;
        ctx.y = checkPage(ctx, 5);
        dc(doc, GRAY_LIGHT);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
        ctx.y += 5;
        tc(doc, BLACK);
      } else {
        ctx.y += 3;
      }
    });
  }

  // =========================================================================
  // DETAIL PAGES
  // =========================================================================
  addFooter(doc, font);
  doc.addPage();
  ctx.y = addHeader(doc, dateStr, font);
  addWatermark(doc, watermarkText);

  doc.setFontSize(14);
  doc.setFont(font, "bold");
  tc(doc, SENA_BLUE);
  doc.text("5. Detalle de Respuestas", MARGIN, ctx.y);
  ctx.y += 10;

  preguntas.forEach((q, index) => {
    const qId = String(q.id);
    const ua = respuestas[qId];

    let isCorrect = "Sin responder";
    let answerText = "(no respondida)";
    let correctTextStr = "";
    let creditoInfo = "";

    if (ua) {
      const credito = calcularCreditoPregunta(q, ua);
      isCorrect = credito === 1 ? "Correcta" : credito > 0 ? "Parcial" : "Incorrecta";

      if (q.tipo === "seleccion_unica" || q.tipo === "seleccion_multiple") {
        const sel = ua.respuestaIds || [];
        answerText =
          q.opciones
            ?.filter((o) => sel.includes(o.id))
            .map((o) => n(o.texto))
            .join("; ") || "(ninguna)";
        if (credito < 1 && q.respuestaCorrecta) {
          correctTextStr =
            q.opciones
              ?.filter((o) => q.respuestaCorrecta!.includes(o.id))
              .map((o) => n(o.texto))
              .join("; ") || "";
        }
        if (isCorrect === "Parcial" && q.tipo === "seleccion_multiple") {
          const aciertos = sel.filter((id: string) =>
            (q.respuestaCorrecta ?? []).includes(id),
          ).length;
          creditoInfo = `${aciertos} de ${(q.respuestaCorrecta ?? []).length} opciones correctas`;
        }
      } else if (q.tipo === "emparejamiento") {
        const emps = ua.emparejamientos || {};
        const pares: { izquierda: string; derecha: string }[] = q.pares || [];
        answerText = pares
          .map((p) => `${n(p.izquierda)} → ${n(emps[p.izquierda] || "Sin selección")}`)
          .join("; ");
        if (credito < 1) {
          correctTextStr = pares
            .map((p) => `${n(p.izquierda)} → ${n(p.derecha)}`)
            .join("; ");
        }
        if (isCorrect === "Parcial") {
          const aciertos = pares.filter(
            (p) => (emps[p.izquierda] ?? "") === p.derecha,
          ).length;
          creditoInfo = `${aciertos} de ${pares.length} pares correctos`;
        }
      }
    }

    // Question header bar
    ctx.y = checkPage(ctx, 14);
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    const tipoLabel =
      q.tipo === "seleccion_unica"
        ? "Seleccion Unica"
        : q.tipo === "seleccion_multiple"
          ? "Seleccion Multiple"
          : "Emparejamiento";

    fc(doc, GRAY_LIGHT);
    doc.rect(MARGIN, ctx.y - 4, CONTENT_W, 7, "F");
    tc(doc, SENA_BLUE);
    doc.text(
      "Pregunta " +
        (index + 1) +
        "  -  " +
        (q.tema || "General") +
        "  -  " +
        tipoLabel,
      MARGIN + 2,
      ctx.y,
    );
    ctx.y += 6;

    // Enunciado
    doc.setFont(font, "normal");
    tc(doc, BLACK);
    doc.setFontSize(9);
    ctx.y = wrapText(ctx, n(q.enunciado), MARGIN + 3, CONTENT_W - 6, 5);
    ctx.y += 2;

    // Answer section
    if (q.tipo === "emparejamiento" && ua) {
      const pares = q.pares || [];
      const emps = ua.emparejamientos || {};
      const COL0 = (CONTENT_W - 4) * 0.37;
      const COL1 = (CONTENT_W - 4) * 0.33;
      const COL2 = 10;
      const COL3 = CONTENT_W - 4 - COL0 - COL1 - COL2;

      const tableBody = pares.map((par) => {
        const sel = emps[n(par.izquierda)] || emps[par.izquierda] || "-";
        const ok = sel === par.derecha;
        return [n(par.izquierda), n(sel), ok ? "1" : "0", n(par.derecha)];
      });

      // Conservative estimate: header row (10) + each data row (~9mm) + padding
      const empEstimate = 10 + pares.length * 9 + 6;
      ctx.y = checkPage(ctx, empEstimate);
      autoTable(doc, {
        startY: ctx.y,
        head: [["Concepto", "Su respuesta", "Val.", "Respuesta correcta"]],
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: SENA_BLUE,
          textColor: 255,
          fontSize: 8,
          halign: "center",
          ...tbl({}),
        },
        bodyStyles: { fontSize: 8, ...tbl({}) },
        columnStyles: {
          0: { cellWidth: COL0 },
          1: { cellWidth: COL1 },
          2: { cellWidth: COL2, halign: "center" },
          3: { cellWidth: COL3 },
        },
        // Prevent table from entering the footer zone / overlapping header
        margin: { top: HEADER_BOTTOM, left: MARGIN, right: MARGIN, bottom: 22 },
        pageBreak: "auto",
        showHead: "everyPage",
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const raw = data.row.raw as string[];
          const isOK = raw[2] === "1";
          if (data.column.index === 2) {
            data.cell.text = [""];
            data.cell.styles.fillColor = isOK ? SENA_GREEN : RED;
          }
          if (data.column.index === 1) {
            data.cell.styles.textColor = isOK ? SENA_GREEN : RED;
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 2) return;
          const raw = data.row.raw as string[];
          const isOK = raw[2] === "1";
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          doc.setFillColor(255, 255, 255);
          doc.circle(cx, cy, 2.2, "F");

          doc.setLineWidth(0.4);
          if (isOK) {
            doc.setDrawColor(SENA_GREEN[0], SENA_GREEN[1], SENA_GREEN[2]);
            // Draw a checkmark using lines
            doc.line(cx - 1, cy, cx - 0.2, cy + 1.2);
            doc.line(cx - 0.2, cy + 1.2, cx + 1.2, cy - 1);
          } else {
            doc.setDrawColor(RED[0], RED[1], RED[2]);
            // Draw an X using lines
            doc.line(cx - 1, cy - 1, cx + 1, cy + 1);
            doc.line(cx + 1, cy - 1, cx - 1, cy + 1);
          }

          tc(doc, BLACK);
        },
        didDrawPage: (data) => {
          addFooter(doc, font);
          // Only add the header on pages after the first (pageNumber > 1)
          if (data.pageNumber > 1) {
            ctx.y = addHeader(doc, dateStr, font);
            addWatermark(doc, watermarkText);
          }
        },
      });
      ctx.y = (doc as unknown as DocWithTable).lastAutoTable.finalY + 3;
    } else {
      // Seleccion unica / multiple
      ctx.y = checkPage(ctx, 10);
      doc.setFontSize(8.5);
      doc.setFont(font, "bold");
      tc(doc, SENA_BLUE);
      doc.text("Su respuesta:", MARGIN + 3, ctx.y);
      doc.setFont(font, "normal");
      if (isCorrect === "Correcta") tc(doc, SENA_GREEN);
      else if (isCorrect === "Incorrecta") tc(doc, RED);
      else tc(doc, GRAY);
      ctx.y = wrapText(ctx, answerText, MARGIN + 38, CONTENT_W - 41, 5);
    }

    // Result badge
    ctx.y = checkPage(ctx, 7);
    doc.setFont(font, "bold");
    doc.setFontSize(8.5);
    if (isCorrect === "Correcta") tc(doc, SENA_GREEN);
    else if (isCorrect === "Incorrecta") tc(doc, RED);
    else if (isCorrect === "Parcial") tc(doc, AMBER);
    else tc(doc, GRAY);
    const badgeLabel = isCorrect === "Parcial" && creditoInfo
      ? `Resultado: ${isCorrect} (${creditoInfo})`
      : `Resultado: ${isCorrect}`;
    doc.text(badgeLabel, MARGIN + 3, ctx.y);
    ctx.y += 5;

    // Correct answer hint (selection questions only)
    if (correctTextStr) {
      ctx.y = checkPage(ctx, 8);
      doc.setFontSize(8);
      doc.setFont(font, "bold");
      tc(doc, SENA_BLUE);
      doc.text("Respuesta correcta:", MARGIN + 3, ctx.y);
      doc.setFont(font, "italic");
      tc(doc, SENA_GREEN);
      ctx.y = wrapText(ctx, correctTextStr, MARGIN + 44, CONTENT_W - 47, 4.5);
    }

    // Retroalimentacion
    if (q.retroalimentacion) {
      ctx.y = checkPage(ctx, 10);
      doc.setFontSize(8);
      doc.setFont(font, "normal");
      tc(doc, GRAY);
      doc.text("Retroalimentacion:", MARGIN + 3, ctx.y);
      ctx.y += 4;
      doc.setFont(font, "italic");
      ctx.y = wrapText(
        ctx,
        q.retroalimentacion,
        MARGIN + 5,
        CONTENT_W - 8,
        4.5,
      );
    }

    // Separator between questions (skip after the last one to avoid near-blank trailing page)
    if (index < preguntas.length - 1) {
      ctx.y += 3;
      ctx.y = checkPage(ctx, 5);
      dc(doc, GRAY_LIGHT);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
      ctx.y += 4;
      tc(doc, BLACK);
    } else {
      ctx.y += 3;
    }
  });

  addFooter(doc, font);

  // Suppress unused warning
  void WHITE;

  // Post-process: apply PDF encryption via @cantoo/pdf-lib
  const jspdfBytes = doc.output("arraybuffer");
  const pdfDoc = await PDFDocument.load(jspdfBytes);
  // PDF passwords must be Latin-1; cedulas are digits-only → strip everything else.
  // This also naturally skips encryption for test-mode where numeroDocumento has non-ASCII chars.
  const userPwd = (datosAprendiz.numeroDocumento ?? "").replace(/\D/g, "");
  if (userPwd) {
    await pdfDoc.encrypt({
      userPassword: userPwd,
      ownerPassword: "SENA_EVALTIC_OWNER_2025",
      permissions: {
        printing: "lowResolution",
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });
  }
  return new Uint8Array(await pdfDoc.save());
}

/** Trigger a browser file download for the encrypted PDF bytes. */
export function savePdf(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
