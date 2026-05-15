/**
 * Helper centralizado para resolución de fechas efectivas de Ficha.
 *
 * Regla: ficha.fechaInicio ?? evaluacion.fechaInicio (idem fin)
 * Acepta Date | string | null | undefined para funcionar en server
 * (Date de Prisma) y client (ISO string serializado).
 */

type DateLike = Date | string | null | undefined;

export interface DateSource {
  fechaInicio: DateLike;
  fechaFin: DateLike;
}

export interface Effective {
  fechaInicio: Date | null;
  fechaFin: Date | null;
}

export type VigenciaResult =
  | { ok: true }
  | { ok: false; reason: "antes" | "despues"; fecha: Date };

function toDate(value: DateLike): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Devuelve las fechas efectivas para una ficha:
 * - Si la ficha tiene fecha propia → la usa
 * - Si no → hereda la de la evaluación
 */
export function getEffectiveDates(
  ficha: DateSource,
  evaluacion: DateSource,
): Effective {
  const fechaInicio = toDate(ficha.fechaInicio) ?? toDate(evaluacion.fechaInicio);
  const fechaFin = toDate(ficha.fechaFin) ?? toDate(evaluacion.fechaFin);
  return { fechaInicio, fechaFin };
}

/**
 * Verifica si `now` cae dentro del rango efectivo.
 * Fechas null se tratan como "sin límite" (siempre dentro del extremo abierto).
 */
export function isVigente(eff: Effective, now: Date): VigenciaResult {
  if (eff.fechaInicio && now < eff.fechaInicio) {
    return { ok: false, reason: "antes", fecha: eff.fechaInicio };
  }
  if (eff.fechaFin && now > eff.fechaFin) {
    return { ok: false, reason: "despues", fecha: eff.fechaFin };
  }
  return { ok: true };
}

/**
 * Convierte un ISO UTC string al formato "YYYY-MM-DDTHH:mm" en hora local
 * del browser — para poblar inputs datetime-local con la hora correcta.
 */
export function utcToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * Convierte el valor de un input datetime-local (hora local del browser)
 * a un ISO UTC string para enviar al API.
 */
export function localInputToISO(local: string | null | undefined): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}
