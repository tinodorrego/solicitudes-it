/** Datos semilla ficticios. Ninguno corresponde a personas u organizaciones reales. */
import type { Db } from "./client";
import { categorias, usuarios } from "./schema";

export const CATEGORIAS_SEMILLA = [
  { nombre: "Incidente", requiereAprobacion: false },
  { nombre: "Consulta", requiereAprobacion: false },
  { nombre: "Acceso a sistemas", requiereAprobacion: true },
  { nombre: "Hardware", requiereAprobacion: true },
  { nombre: "Instalación de software", requiereAprobacion: true },
];

export const USUARIOS_SEMILLA = [
  { nombre: "Ana Torres", email: "ana.torres@ejemplo.test", area: "Finanzas", rol: "SOLICITANTE" as const },
  { nombre: "Bruno Paz", email: "bruno.paz@ejemplo.test", area: "Comercial", rol: "SOLICITANTE" as const },
  { nombre: "Carla Ríos", email: "carla.rios@ejemplo.test", area: "Mesa de ayuda", rol: "AGENTE" as const },
  { nombre: "Martín Gil", email: "martin.gil@ejemplo.test", area: "Mesa de ayuda", rol: "AGENTE" as const },
  { nombre: "Diego Sosa", email: "diego.sosa@ejemplo.test", area: "Gerencia IT", rol: "APROBADOR" as const },
];

/** Idempotente: agrega lo que falte sin duplicar (claves únicas por nombre y email). */
export async function sembrar(db: Db): Promise<void> {
  await db.insert(categorias).values(CATEGORIAS_SEMILLA).onConflictDoNothing();
  await db.insert(usuarios).values(USUARIOS_SEMILLA).onConflictDoNothing();
}
