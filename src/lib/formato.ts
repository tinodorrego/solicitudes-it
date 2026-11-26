import type { Estado, EstadoSla, Nivel, Prioridad } from "@/domain/solicitud";

export const ZONA = "America/Argentina/Buenos_Aires";

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  NUEVA: "Nueva",
  ASIGNADA: "Asignada",
  EN_PROGRESO: "En progreso",
  RESUELTA: "Resuelta",
  CERRADA: "Cerrada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export const ETIQUETA_NIVEL: Record<Nivel, string> = { ALTO: "Alto", MEDIO: "Medio", BAJO: "Bajo" };

export const ETIQUETA_SLA: Record<EstadoSla, string> = {
  EN_TERMINO: "En término",
  EN_RIESGO: "En riesgo",
  VENCIDA: "Vencida",
  SIN_SLA: "Sin SLA",
  CUMPLIDA: "Cumplida",
};

const dia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const hora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const diaCorto = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "short", day: "2-digit", month: "2-digit" });

/** Hora grande para la celda del tablero y un rótulo de día relativo. */
export function formatearVencimiento(fecha: Date, ahora: Date): { hora: string; dia: string } {
  const unDia = 24 * 60 * 60 * 1000;
  const d = dia.format(fecha);
  let etiqueta = diaCorto.format(fecha);
  if (d === dia.format(ahora)) etiqueta = "hoy";
  else if (d === dia.format(new Date(ahora.getTime() + unDia))) etiqueta = "mañana";
  else if (d === dia.format(new Date(ahora.getTime() - unDia))) etiqueta = "ayer";
  return { hora: hora.format(fecha), dia: etiqueta };
}

export function formatearHoras(horas: number): string {
  if (horas < 24) return `${horas} h`;
  const dias = horas / 24;
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}
