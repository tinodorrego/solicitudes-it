/** Modelo físico. Ver docs/05-modelo-datos.md (DER y diccionario de datos). */
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { ESTADOS, NIVELES, PRIORIDADES } from "@/domain/solicitud";
import { ROLES } from "@/domain/acciones";

export const rolEnum = pgEnum("rol", ROLES);
export const nivelEnum = pgEnum("nivel", NIVELES);
export const prioridadEnum = pgEnum("prioridad", PRIORIDADES);
export const estadoEnum = pgEnum("estado", ESTADOS);

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  area: varchar("area", { length: 80 }).notNull(),
  rol: rolEnum("rol").notNull(),
});

export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 80 }).notNull().unique(),
  requiereAprobacion: boolean("requiere_aprobacion").notNull().default(false),
});

export const solicitudes = pgTable(
  "solicitudes",
  {
    id: serial("id").primaryKey(),
    titulo: varchar("titulo", { length: 120 }).notNull(),
    descripcion: text("descripcion").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    solicitanteId: integer("solicitante_id")
      .notNull()
      .references(() => usuarios.id),
    asignadoId: integer("asignado_id").references(() => usuarios.id),
    impacto: nivelEnum("impacto").notNull(),
    urgencia: nivelEnum("urgencia").notNull(),
    prioridad: prioridadEnum("prioridad").notNull(),
    estado: estadoEnum("estado").notNull(),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull(),
    inicioSla: timestamp("inicio_sla", { withTimezone: true }),
    venceEn: timestamp("vence_en", { withTimezone: true }),
    /** Momento de la última resolución; se limpia al reabrir. Base del cumplimiento de SLA (RF-13). */
    resueltaEn: timestamp("resuelta_en", { withTimezone: true }),
  },
  (t) => [index("solicitudes_estado_idx").on(t.estado), index("solicitudes_vence_idx").on(t.venceEn)],
);

export const historialEstados = pgTable(
  "historial_estados",
  {
    id: serial("id").primaryKey(),
    solicitudId: integer("solicitud_id")
      .notNull()
      .references(() => solicitudes.id, { onDelete: "cascade" }),
    estadoAnterior: estadoEnum("estado_anterior"),
    estadoNuevo: estadoEnum("estado_nuevo").notNull(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    motivo: text("motivo"),
    ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).notNull(),
  },
  (t) => [index("historial_solicitud_idx").on(t.solicitudId)],
);

export const tipoComentarioEnum = pgEnum("tipo_comentario", ["COMENTARIO", "EDICION"]);

/** RF-11 y RF-12 — Comentarios de seguimiento y registro de ediciones. */
export const comentarios = pgTable(
  "comentarios",
  {
    id: serial("id").primaryKey(),
    solicitudId: integer("solicitud_id")
      .notNull()
      .references(() => solicitudes.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    tipo: tipoComentarioEnum("tipo").notNull().default("COMENTARIO"),
    texto: text("texto").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull(),
  },
  (t) => [index("comentarios_solicitud_idx").on(t.solicitudId)],
);
