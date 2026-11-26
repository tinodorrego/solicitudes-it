/**
 * Casos de uso de solicitudes. Reciben la base por parámetro para poder
 * probarse contra una base en memoria (ver tests/).
 */
import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { categorias, historialEstados, solicitudes, usuarios } from "@/db/schema";
import {
  calcularPrioridad,
  calcularVencimiento,
  estadoInicial,
  type Estado,
  type NuevaSolicitud,
} from "@/domain/solicitud";

export class ErrorDeNegocio extends Error {}

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

/** RF-05 — Ordena por vencimiento (sin SLA al final) y filtra por estado. */
export async function listarSolicitudes(db: Db, filtro: { estado?: Estado } = {}) {
  return db
    .select({
      id: solicitudes.id,
      titulo: solicitudes.titulo,
      estado: solicitudes.estado,
      prioridad: solicitudes.prioridad,
      creadaEn: solicitudes.creadaEn,
      inicioSla: solicitudes.inicioSla,
      venceEn: solicitudes.venceEn,
      categoria: categorias.nombre,
      solicitante: usuarios.nombre,
      area: usuarios.area,
    })
    .from(solicitudes)
    .innerJoin(categorias, eq(solicitudes.categoriaId, categorias.id))
    .innerJoin(usuarios, eq(solicitudes.solicitanteId, usuarios.id))
    .where(filtro.estado ? eq(solicitudes.estado, filtro.estado) : undefined)
    .orderBy(sql`${solicitudes.venceEn} asc nulls last`, asc(solicitudes.id));
}

export async function obtenerHistorial(db: Db, solicitudId: number) {
  return db
    .select()
    .from(historialEstados)
    .where(eq(historialEstados.solicitudId, solicitudId))
    .orderBy(asc(historialEstados.ocurridoEn));
}

export async function listarCatalogos(db: Db) {
  const [cats, solicitantes] = await Promise.all([
    db.select().from(categorias).orderBy(asc(categorias.id)),
    db.select().from(usuarios).where(eq(usuarios.rol, "SOLICITANTE")).orderBy(asc(usuarios.nombre)),
  ]);
  return { categorias: cats, solicitantes };
}
