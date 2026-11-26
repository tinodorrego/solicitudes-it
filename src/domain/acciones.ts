/**
 * Acciones del ciclo de vida y permisos por rol.
 * Ver docs/03-srs.md: RF-07, RF-08, RF-09, RF-11, RN-04 y RN-06.
 */
import { z } from "zod";
import { NIVELES, puedeTransicionar, type Estado } from "./solicitud";

export const ROLES = ["SOLICITANTE", "AGENTE", "APROBADOR"] as const;
export type Rol = (typeof ROLES)[number];

export const ACCIONES = ["APROBAR", "RECHAZAR", "ASIGNAR", "INICIAR", "RESOLVER", "CERRAR", "REABRIR", "CANCELAR"] as const;
export type Accion = (typeof ACCIONES)[number];

type Quien = "APROBADOR" | "AGENTE" | "AGENTE_ASIGNADO" | "SOLICITANTE_DUENIO";

type Definicion = {
  desde: readonly Estado[];
  hacia: Estado;
  quien: Quien;
  /** "obligatorio": la acción exige un motivo o nota escrita. */
  motivo: "obligatorio" | "opcional";
  etiqueta: string;
};

/** RN-06 — Quién puede ejecutar cada acción y desde qué estados. */
export const DEFINICION_ACCIONES: Record<Accion, Definicion> = {
  APROBAR: { desde: ["PENDIENTE_APROBACION"], hacia: "NUEVA", quien: "APROBADOR", motivo: "opcional", etiqueta: "Aprobar" },
  RECHAZAR: { desde: ["PENDIENTE_APROBACION"], hacia: "RECHAZADA", quien: "APROBADOR", motivo: "obligatorio", etiqueta: "Rechazar" },
  ASIGNAR: { desde: ["NUEVA"], hacia: "ASIGNADA", quien: "AGENTE", motivo: "opcional", etiqueta: "Asignar" },
  INICIAR: { desde: ["ASIGNADA"], hacia: "EN_PROGRESO", quien: "AGENTE_ASIGNADO", motivo: "opcional", etiqueta: "Empezar a trabajar" },
  RESOLVER: { desde: ["EN_PROGRESO"], hacia: "RESUELTA", quien: "AGENTE_ASIGNADO", motivo: "obligatorio", etiqueta: "Marcar como resuelta" },
  CERRAR: { desde: ["RESUELTA"], hacia: "CERRADA", quien: "SOLICITANTE_DUENIO", motivo: "opcional", etiqueta: "Confirmar y cerrar" },
  REABRIR: { desde: ["RESUELTA"], hacia: "EN_PROGRESO", quien: "SOLICITANTE_DUENIO", motivo: "obligatorio", etiqueta: "Reabrir" },
  CANCELAR: {
    desde: ["PENDIENTE_APROBACION", "NUEVA", "ASIGNADA"],
    hacia: "CANCELADA",
    quien: "SOLICITANTE_DUENIO",
    motivo: "obligatorio",
    etiqueta: "Cancelar pedido",
  },
};

export type Actor = { id: number; rol: Rol };
export type SolicitudParaPermisos = { estado: Estado; solicitanteId: number; asignadoId: number | null };

export type Resultado = { ok: true } | { ok: false; motivo: string };

/** RF-09 / RN-04 / RN-06 — Valida estado de origen, transición y permiso del actor. */
export function puedeEjecutar(accion: Accion, s: SolicitudParaPermisos, actor: Actor): Resultado {
  const def = DEFINICION_ACCIONES[accion];
  if (!def.desde.includes(s.estado) || !puedeTransicionar(s.estado, def.hacia)) {
    return { ok: false, motivo: `No se puede ${def.etiqueta.toLowerCase()} una solicitud en este estado.` };
  }
  switch (def.quien) {
    case "APROBADOR":
      return actor.rol === "APROBADOR" ? { ok: true } : { ok: false, motivo: "Solo un aprobador puede hacerlo." };
    case "AGENTE":
      return actor.rol === "AGENTE" ? { ok: true } : { ok: false, motivo: "Solo un agente de la mesa de ayuda puede hacerlo." };
    case "AGENTE_ASIGNADO":
      return actor.rol === "AGENTE" && s.asignadoId === actor.id
        ? { ok: true }
        : { ok: false, motivo: "Solo el agente asignado puede hacerlo." };
    case "SOLICITANTE_DUENIO":
      return s.solicitanteId === actor.id ? { ok: true } : { ok: false, motivo: "Solo quien pidió la solicitud puede hacerlo." };
  }
}

export function accionesDisponibles(s: SolicitudParaPermisos, actor: Actor): Accion[] {
  return ACCIONES.filter((a) => puedeEjecutar(a, s, actor).ok);
}

/** RF-11 — Solo quien la pidió puede editarla, y solo antes de que alguien la tome. */
export function puedeEditar(s: SolicitudParaPermisos, actor: Actor): Resultado {
  if (s.solicitanteId !== actor.id) return { ok: false, motivo: "Solo quien pidió la solicitud puede editarla." };
  if (s.estado !== "PENDIENTE_APROBACION" && s.estado !== "NUEVA") {
    return { ok: false, motivo: "Ya no se puede editar: la solicitud está siendo atendida o terminó." };
  }
  return { ok: true };
}

/** RF-12 — Se puede comentar mientras la solicitud no esté en un estado final. */
export function puedeComentar(estado: Estado): boolean {
  return estado !== "CERRADA" && estado !== "RECHAZADA" && estado !== "CANCELADA";
}

export const motivoSchema = z.string().trim().max(1000, "El texto no puede superar los 1000 caracteres.");

export const edicionSchema = z.object({
  titulo: z.string().trim().min(5, "El título debe tener al menos 5 caracteres.").max(120, "El título no puede superar los 120 caracteres."),
  descripcion: z
    .string()
    .trim()
    .min(10, "Describí el pedido con al menos 10 caracteres.")
    .max(2000, "La descripción no puede superar los 2000 caracteres."),
  impacto: z.enum(NIVELES, "Indicá el impacto."),
  urgencia: z.enum(NIVELES, "Indicá la urgencia."),
});
export type Edicion = z.infer<typeof edicionSchema>;

export const comentarioSchema = z
  .string()
  .trim()
  .min(2, "Escribí el comentario.")
  .max(1000, "El comentario no puede superar los 1000 caracteres.");
