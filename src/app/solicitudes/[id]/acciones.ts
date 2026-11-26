"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerDb } from "@/db/client";
import { ACCIONES, comentarioSchema, edicionSchema, motivoSchema, type Accion } from "@/domain/acciones";
import { obtenerActorActual } from "@/lib/actor";
import { comentar, editarSolicitud, ejecutarAccion, ErrorDeNegocio } from "@/services/solicitudes";

export type Respuesta = { error?: string; ok?: string; errores?: Partial<Record<string, string[]>>; valores?: Record<string, string> };

function actorDe(u: { id: number; rol: "SOLICITANTE" | "AGENTE" | "APROBADOR" }) {
  return { id: u.id, rol: u.rol };
}

/** RF-07, RF-08, RF-09 — El actor sale del servidor, nunca del formulario (RN-06). */
export async function ejecutarAccionForm(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const solicitudId = Number(formData.get("solicitudId"));
  const accion = String(formData.get("accion")) as Accion;
  if (!ACCIONES.includes(accion)) return { error: "Acción desconocida." };

  const motivo = motivoSchema.safeParse(String(formData.get("motivo") ?? ""));
  if (!motivo.success) return { error: motivo.error.issues[0].message };
  const asignadoId = formData.get("asignadoId") ? Number(formData.get("asignadoId")) : undefined;

  try {
    const [{ actor }, db] = await Promise.all([obtenerActorActual(), obtenerDb()]);
    await ejecutarAccion(db, { solicitudId, accion, actor: actorDe(actor), motivo: motivo.data, asignadoId });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath("/");
  revalidatePath(`/solicitudes/${solicitudId}`);
  return { ok: "Listo." };
}

/** RF-12 */
export async function comentarForm(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const solicitudId = Number(formData.get("solicitudId"));
  const texto = comentarioSchema.safeParse(String(formData.get("texto") ?? ""));
  if (!texto.success) return { error: texto.error.issues[0].message };
  try {
    const [{ actor }, db] = await Promise.all([obtenerActorActual(), obtenerDb()]);
    await comentar(db, { solicitudId, actor: actorDe(actor), texto: texto.data });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(`/solicitudes/${solicitudId}`);
  return { ok: "Comentario agregado." };
}

/** RF-11 */
export async function editarForm(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const solicitudId = Number(formData.get("solicitudId"));
  const valores = Object.fromEntries(["titulo", "descripcion", "impacto", "urgencia"].map((k) => [k, String(formData.get(k) ?? "")]));
  const datos = edicionSchema.safeParse(valores);
  if (!datos.success) {
    const errores: Record<string, string[]> = {};
    for (const i of datos.error.issues) (errores[String(i.path[0])] ??= []).push(i.message);
    return { errores, error: "Revisá los campos marcados.", valores };
  }
  try {
    const [{ actor }, db] = await Promise.all([obtenerActorActual(), obtenerDb()]);
    await editarSolicitud(db, { solicitudId, actor: actorDe(actor), datos: datos.data });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message, valores };
    throw e;
  }
  revalidatePath("/");
  revalidatePath(`/solicitudes/${solicitudId}`);
  redirect(`/solicitudes/${solicitudId}`);
}
