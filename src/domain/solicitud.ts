/**
 * Reglas de negocio del dominio "Solicitud IT".
 * Cada función referencia la regla (RN-xx) o requisito (RF-xx) del SRS que implementa.
 * Ver docs/03-srs.md.
 */
import { z } from "zod";

export const NIVELES = ["ALTO", "MEDIO", "BAJO"] as const;
export type Nivel = (typeof NIVELES)[number];

export const PRIORIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const ESTADOS = [
  "PENDIENTE_APROBACION",
  "NUEVA",
  "ASIGNADA",
  "EN_PROGRESO",
  "RESUELTA",
  "CERRADA",
  "RECHAZADA",
  "CANCELADA",
] as const;
export type Estado = (typeof ESTADOS)[number];

/** RN-01 — Matriz impacto × urgencia → prioridad. */
const MATRIZ_PRIORIDAD: Record<Nivel, Record<Nivel, Prioridad>> = {
  ALTO: { ALTO: "CRITICA", MEDIO: "ALTA", BAJO: "MEDIA" },
  MEDIO: { ALTO: "ALTA", MEDIO: "MEDIA", BAJO: "BAJA" },
  BAJO: { ALTO: "MEDIA", MEDIO: "BAJA", BAJO: "BAJA" },
};

/** RF-02 / RN-01 */
export function calcularPrioridad(impacto: Nivel, urgencia: Nivel): Prioridad {
  return MATRIZ_PRIORIDAD[impacto][urgencia];
}

/** RN-02 — Horas de resolución comprometidas por prioridad (horas corridas en v0.1). */
export const SLA_HORAS: Record<Prioridad, number> = {
  CRITICA: 4,
  ALTA: 8,
  MEDIA: 24,
  BAJA: 72,
};

/** RF-03 / RN-02 */
export function calcularVencimiento(prioridad: Prioridad, inicio: Date): Date {
  return new Date(inicio.getTime() + SLA_HORAS[prioridad] * 60 * 60 * 1000);
}

/**
 * RF-04 / RN-03 — Si la categoría requiere aprobación, la solicitud nace en
 * PENDIENTE_APROBACION y el reloj de SLA no corre hasta que se apruebe.
 */
export function estadoInicial(requiereAprobacion: boolean): Estado {
  return requiereAprobacion ? "PENDIENTE_APROBACION" : "NUEVA";
}

/** RN-04 — Transiciones permitidas del ciclo de vida. */
export const TRANSICIONES: Record<Estado, readonly Estado[]> = {
  PENDIENTE_APROBACION: ["NUEVA", "RECHAZADA", "CANCELADA"],
  NUEVA: ["ASIGNADA", "CANCELADA"],
  ASIGNADA: ["EN_PROGRESO", "CANCELADA"],
  EN_PROGRESO: ["RESUELTA"],
  RESUELTA: ["CERRADA", "EN_PROGRESO"],
  CERRADA: [],
  RECHAZADA: [],
  CANCELADA: [],
};

/** RF-09 / RN-04 */
export function puedeTransicionar(desde: Estado, hacia: Estado): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function esEstadoFinal(estado: Estado): boolean {
  return TRANSICIONES[estado].length === 0;
}

export type EstadoSla = "SIN_SLA" | "EN_TERMINO" | "EN_RIESGO" | "VENCIDA" | "CUMPLIDA";

/**
 * RF-10 / RN-05 — Semáforo de SLA. "En riesgo" cuando queda menos del 25 %
 * del plazo total. Las solicitudes resueltas o en estado final no se evalúan.
 */
export function evaluarSla(params: {
  estado: Estado;
  inicioSla: Date | null;
  vencimiento: Date | null;
  ahora: Date;
}): EstadoSla {
  const { estado, inicioSla, vencimiento, ahora } = params;
  if (estado === "RESUELTA" || estado === "CERRADA") return "CUMPLIDA";
  if (!inicioSla || !vencimiento || esEstadoFinal(estado)) return "SIN_SLA";

  const total = vencimiento.getTime() - inicioSla.getTime();
  const restante = vencimiento.getTime() - ahora.getTime();
  if (restante <= 0) return "VENCIDA";
  if (restante < total * 0.25) return "EN_RIESGO";
  return "EN_TERMINO";
}

/** RF-01 — Validación de alta. Se ejecuta del lado del servidor (RNF-01). */
export const nuevaSolicitudSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, "El título debe tener al menos 5 caracteres.")
    .max(120, "El título no puede superar los 120 caracteres."),
  descripcion: z
    .string()
    .trim()
    .min(10, "Describí el pedido con al menos 10 caracteres.")
    .max(2000, "La descripción no puede superar los 2000 caracteres."),
  categoriaId: z.coerce.number().int().positive("Elegí una categoría."),
  solicitanteId: z.coerce.number().int().positive("Elegí un solicitante."),
  impacto: z.enum(NIVELES, "Indicá el impacto."),
  urgencia: z.enum(NIVELES, "Indicá la urgencia."),
});

export type NuevaSolicitud = z.infer<typeof nuevaSolicitudSchema>;

/** Código legible para usuarios: SOL-0001. */
export function formatearCodigo(id: number): string {
  return `SOL-${String(id).padStart(4, "0")}`;
}
