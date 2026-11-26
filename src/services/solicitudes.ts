/**
 * Casos de uso de solicitudes. Reciben la base por parámetro para poder
 * probarse contra una base en memoria (ver tests/).
 */
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db/client";
import { categorias, comentarios, historialEstados, solicitudes, usuarios } from "@/db/schema";
import {
  calcularPrioridad,
  calcularVencimiento,
  estadoInicial,
  type Estado,
  type NuevaSolicitud,
} from "@/domain/solicitud";
import {
  DEFINICION_ACCIONES,
  puedeComentar,
  puedeEditar,
  puedeEjecutar,
  type Accion,
  type Actor,
  type Edicion,
} from "@/domain/acciones";
import { ETIQUETA_NIVEL, ETIQUETA_URGENCIA } from "@/lib/formato";

export class ErrorDeNegocio extends Error {}

const asignados = alias(usuarios, "asignados");

/** RF-01, RF-02, RF-03, RF-04, RF-06 */
export async function crearSolicitud(db: Db, datos: NuevaSolicitud, ahora: Date = new Date()) {
  const [categoria] = await db.select().from(categorias).where(eq(categorias.id, datos.categoriaId));
  if (!categoria) throw new ErrorDeNegocio("La categoría elegida no existe.");

  const [solicitante] = await db.select().from(usuarios).where(eq(usuarios.id, datos.solicitanteId));
  if (!solicitante) throw new ErrorDeNegocio("El solicitante elegido no existe.");

  const prioridad = calcularPrioridad(datos.impacto, datos.urgencia);
  const estado = estadoInicial(categoria.requiereAprobacion);
  // RN-03: el SLA corre desde la creación solo si no hace falta aprobación.
  const corre = estado === "NUEVA";

  return db.transaction(async (tx) => {
    const [creada] = await tx
      .insert(solicitudes)
      .values({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        categoriaId: categoria.id,
        solicitanteId: solicitante.id,
        impacto: datos.impacto,
        urgencia: datos.urgencia,
        prioridad,
        estado,
        creadaEn: ahora,
        inicioSla: corre ? ahora : null,
        venceEn: corre ? calcularVencimiento(prioridad, ahora) : null,
      })
      .returning();

    await tx.insert(historialEstados).values({
      solicitudId: creada.id,
      estadoAnterior: null,
      estadoNuevo: estado,
      usuarioId: solicitante.id,
      ocurridoEn: ahora,
    });

    return creada;
  });
}

const columnasListado = {
  id: solicitudes.id,
  titulo: solicitudes.titulo,
  descripcion: solicitudes.descripcion,
  estado: solicitudes.estado,
  prioridad: solicitudes.prioridad,
  impacto: solicitudes.impacto,
  urgencia: solicitudes.urgencia,
  creadaEn: solicitudes.creadaEn,
  inicioSla: solicitudes.inicioSla,
  venceEn: solicitudes.venceEn,
  resueltaEn: solicitudes.resueltaEn,
  solicitanteId: solicitudes.solicitanteId,
  asignadoId: solicitudes.asignadoId,
  categoriaId: solicitudes.categoriaId,
  categoria: categorias.nombre,
  requiereAprobacion: categorias.requiereAprobacion,
  solicitante: usuarios.nombre,
  area: usuarios.area,
  asignado: asignados.nombre,
};

function consultaBase(db: Db) {
  return db
    .select(columnasListado)
    .from(solicitudes)
    .innerJoin(categorias, eq(solicitudes.categoriaId, categorias.id))
    .innerJoin(usuarios, eq(solicitudes.solicitanteId, usuarios.id))
    .leftJoin(asignados, eq(solicitudes.asignadoId, asignados.id));
}

export type FiltroListado = { estado?: Estado; solicitanteId?: number; asignadoId?: number };

/**
 * RF-05 — Primero lo que todavía requiere trabajo, por vencimiento (sin SLA al final);
 * después las resueltas y por último las terminadas, de la más reciente a la más vieja.
 * Filtra por estado, solicitante o agente.
 */
export async function listarSolicitudes(db: Db, filtro: FiltroListado = {}) {
  const condiciones: SQL[] = [];
  if (filtro.estado) condiciones.push(eq(solicitudes.estado, filtro.estado));
  if (filtro.solicitanteId) condiciones.push(eq(solicitudes.solicitanteId, filtro.solicitanteId));
  if (filtro.asignadoId) condiciones.push(eq(solicitudes.asignadoId, filtro.asignadoId));
  const grupo = sql`case
    when ${solicitudes.estado} in ('CERRADA', 'RECHAZADA', 'CANCELADA') then 2
    when ${solicitudes.estado} = 'RESUELTA' then 1
    else 0 end`;
  return consultaBase(db)
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(
      grupo,
      sql`case when ${grupo} = 0 then ${solicitudes.venceEn} end asc nulls last`,
      sql`${solicitudes.creadaEn} desc`,
      asc(solicitudes.id),
    );
}

export type SolicitudDetalle = Awaited<ReturnType<typeof listarSolicitudes>>[number];

export async function obtenerSolicitud(db: Db, id: number): Promise<SolicitudDetalle | undefined> {
  const [fila] = await consultaBase(db).where(eq(solicitudes.id, id));
  return fila;
}

/**
 * RF-07, RF-08, RF-09 — Ejecuta una acción del ciclo de vida validando estado y permisos (RN-04, RN-06)
 * y deja el cambio en el historial (RF-06).
 */
export async function ejecutarAccion(
  db: Db,
  params: { solicitudId: number; accion: Accion; actor: Actor; motivo?: string; asignadoId?: number },
  ahora: Date = new Date(),
) {
  const { solicitudId, accion, actor } = params;
  const motivo = params.motivo?.trim() || null;
  const def = DEFINICION_ACCIONES[accion];

  const [s] = await db.select().from(solicitudes).where(eq(solicitudes.id, solicitudId));
  if (!s) throw new ErrorDeNegocio("La solicitud no existe.");

  const permiso = puedeEjecutar(accion, s, actor);
  if (!permiso.ok) throw new ErrorDeNegocio(permiso.motivo);
  if (def.motivo === "obligatorio" && !motivo) {
    throw new ErrorDeNegocio(accion === "RESOLVER" ? "Contá cómo se resolvió." : "Indicá el motivo.");
  }

  const cambios: Partial<typeof solicitudes.$inferInsert> = { estado: def.hacia };

  if (accion === "APROBAR") {
    // RN-03: el SLA empieza a correr al aprobar.
    cambios.inicioSla = ahora;
    cambios.venceEn = calcularVencimiento(s.prioridad, ahora);
  }
  if (accion === "ASIGNAR") {
    const destino = params.asignadoId ?? actor.id;
    const [agente] = await db.select().from(usuarios).where(eq(usuarios.id, destino));
    if (!agente || agente.rol !== "AGENTE") throw new ErrorDeNegocio("Solo se puede asignar a un agente de la mesa de ayuda.");
    cambios.asignadoId = agente.id;
  }
  if (accion === "RESOLVER") cambios.resueltaEn = ahora;
  if (accion === "REABRIR") cambios.resueltaEn = null;

  return db.transaction(async (tx) => {
    // El filtro por estado evita pisar un cambio concurrente.
    const [actualizada] = await tx
      .update(solicitudes)
      .set(cambios)
      .where(and(eq(solicitudes.id, s.id), eq(solicitudes.estado, s.estado)))
      .returning();
    if (!actualizada) throw new ErrorDeNegocio("La solicitud cambió mientras tanto. Recargá la página.");

    await tx.insert(historialEstados).values({
      solicitudId: s.id,
      estadoAnterior: s.estado,
      estadoNuevo: def.hacia,
      usuarioId: actor.id,
      motivo,
      ocurridoEn: ahora,
    });
    return actualizada;
  });
}

/** RF-11 — Edita datos y recalcula prioridad y vencimiento manteniendo el inicio del SLA. */
export async function editarSolicitud(db: Db, params: { solicitudId: number; actor: Actor; datos: Edicion }, ahora: Date = new Date()) {
  const { solicitudId, actor, datos } = params;
  const [s] = await db.select().from(solicitudes).where(eq(solicitudes.id, solicitudId));
  if (!s) throw new ErrorDeNegocio("La solicitud no existe.");
  const permiso = puedeEditar(s, actor);
  if (!permiso.ok) throw new ErrorDeNegocio(permiso.motivo);

  const prioridad = calcularPrioridad(datos.impacto, datos.urgencia);
  const venceEn = s.inicioSla ? calcularVencimiento(prioridad, s.inicioSla) : null;

  const cambios: string[] = [];
  if (s.titulo !== datos.titulo) cambios.push("título");
  if (s.descripcion !== datos.descripcion) cambios.push("detalle");
  if (s.impacto !== datos.impacto) cambios.push(`impacto ${ETIQUETA_NIVEL[s.impacto]} → ${ETIQUETA_NIVEL[datos.impacto]}`);
  if (s.urgencia !== datos.urgencia) cambios.push(`urgencia ${ETIQUETA_URGENCIA[s.urgencia]} → ${ETIQUETA_URGENCIA[datos.urgencia]}`);
  if (cambios.length === 0) return s;

  return db.transaction(async (tx) => {
    const [actualizada] = await tx
      .update(solicitudes)
      .set({ ...datos, prioridad, venceEn })
      .where(eq(solicitudes.id, s.id))
      .returning();
    await tx.insert(comentarios).values({
      solicitudId: s.id,
      usuarioId: actor.id,
      tipo: "EDICION",
      texto: `Editó ${cambios.join(", ")}.`,
      creadoEn: ahora,
    });
    return actualizada;
  });
}

/** RF-12 — Comentario de seguimiento. */
export async function comentar(db: Db, params: { solicitudId: number; actor: Actor; texto: string }, ahora: Date = new Date()) {
  const [s] = await db.select().from(solicitudes).where(eq(solicitudes.id, params.solicitudId));
  if (!s) throw new ErrorDeNegocio("La solicitud no existe.");
  if (!puedeComentar(s.estado)) throw new ErrorDeNegocio("La solicitud está cerrada: ya no admite comentarios.");
  const [c] = await db
    .insert(comentarios)
    .values({ solicitudId: s.id, usuarioId: params.actor.id, texto: params.texto, creadoEn: ahora })
    .returning();
  return c;
}

export type EventoSeguimiento =
  | { tipo: "ESTADO"; id: string; en: Date; autor: string; desde: Estado | null; hacia: Estado; motivo: string | null }
  | { tipo: "COMENTARIO" | "EDICION"; id: string; en: Date; autor: string; texto: string };

/** RF-06 y RF-12 — Historial de estados y comentarios en una sola línea de tiempo. */
export async function obtenerSeguimiento(db: Db, solicitudId: number): Promise<EventoSeguimiento[]> {
  const [estados, notas] = await Promise.all([
    db
      .select({ h: historialEstados, autor: usuarios.nombre })
      .from(historialEstados)
      .innerJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
      .where(eq(historialEstados.solicitudId, solicitudId)),
    db
      .select({ c: comentarios, autor: usuarios.nombre })
      .from(comentarios)
      .innerJoin(usuarios, eq(comentarios.usuarioId, usuarios.id))
      .where(eq(comentarios.solicitudId, solicitudId)),
  ]);
  const eventos: EventoSeguimiento[] = [
    ...estados.map(({ h, autor }) => ({
      tipo: "ESTADO" as const,
      id: `e${h.id}`,
      en: h.ocurridoEn,
      autor,
      desde: h.estadoAnterior,
      hacia: h.estadoNuevo,
      motivo: h.motivo,
    })),
    ...notas.map(({ c, autor }) => ({ tipo: c.tipo, id: `c${c.id}`, en: c.creadoEn, autor, texto: c.texto })),
  ];
  return eventos.sort((a, b) => a.en.getTime() - b.en.getTime() || a.id.localeCompare(b.id));
}

export async function obtenerHistorial(db: Db, solicitudId: number) {
  return db
    .select()
    .from(historialEstados)
    .where(eq(historialEstados.solicitudId, solicitudId))
    .orderBy(asc(historialEstados.ocurridoEn), asc(historialEstados.id));
}

export async function listarUsuarios(db: Db) {
  return db.select().from(usuarios).orderBy(asc(usuarios.rol), asc(usuarios.nombre));
}

export async function listarCatalogos(db: Db) {
  const [cats, solicitantes] = await Promise.all([
    db.select().from(categorias).orderBy(asc(categorias.id)),
    db.select().from(usuarios).where(eq(usuarios.rol, "SOLICITANTE")).orderBy(asc(usuarios.nombre)),
  ]);
  return { categorias: cats, solicitantes };
}
