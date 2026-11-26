"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerDb } from "@/db/client";
import { nuevaSolicitudSchema } from "@/domain/solicitud";
import { crearSolicitud, ErrorDeNegocio } from "@/services/solicitudes";
import { obtenerActorActual } from "@/lib/actor";

export type EstadoFormulario = {
  errores?: Partial<Record<string, string[]>>;
  mensaje?: string;
  valores?: Record<string, string>;
};

/** RF-01 — Alta. Valida del lado del servidor (RNF-01) aunque el formulario ya valide en el navegador. */
export async function registrarSolicitud(_prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = Object.fromEntries(
    ["titulo", "descripcion", "categoriaId", "impacto", "urgencia"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  // Quien pide es el usuario actual; nunca se toma del formulario (RN-06).
  const { actor } = await obtenerActorActual();

  const resultado = nuevaSolicitudSchema.safeParse({ ...valores, solicitanteId: actor.id });
  if (!resultado.success) {
    const errores: Record<string, string[]> = {};
    for (const issue of resultado.error.issues) {
      const campo = String(issue.path[0]);
      (errores[campo] ??= []).push(issue.message);
    }
    return { errores, mensaje: "Revisá los campos marcados.", valores };
  }

  let id: number;
  try {
    const db = await obtenerDb();

    id = (await crearSolicitud(db, resultado.data)).id;
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { mensaje: e.message, valores };
    throw e;
  }

  revalidatePath("/");
  redirect(`/?creada=${id}`);
}
