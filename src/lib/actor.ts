/**
 * Usuario actual simulado (RNF-03 pendiente): sin login, la persona elige "Actuando como"
 * y la elección viaja en una cookie. Los permisos se validan igual en el servidor (RN-06),
 * así que cambiar a un login real solo reemplaza este archivo.
 */
import { cookies } from "next/headers";
import { obtenerDb } from "@/db/client";
import { listarUsuarios } from "@/services/solicitudes";

export const COOKIE_ACTOR = "actor";

export async function obtenerActorActual() {
  // Primero el dato del request (cookies) y recién después la base: así Next sabe que es dinámico.
  const store = await cookies();
  const db = await obtenerDb();
  const usuarios = await listarUsuarios(db);
  const id = Number(store.get(COOKIE_ACTOR)?.value);
  const actor = usuarios.find((u) => u.id === id) ?? usuarios.find((u) => u.rol === "SOLICITANTE")!;
  return { actor, usuarios };
}
