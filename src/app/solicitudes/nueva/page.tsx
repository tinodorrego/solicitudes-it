import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { listarCatalogos } from "@/services/solicitudes";
import { obtenerActorActual } from "@/lib/actor";
import { FormularioSolicitud } from "./formulario";

export const metadata: Metadata = { title: "Nueva solicitud" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Nueva solicitud</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-tinta-2">Cargando el formulario…</p>}>
        <Formulario />
      </Suspense>
    </>
  );
}

async function Formulario() {
  await connection();
  const [db, { actor }] = await Promise.all([obtenerDb(), obtenerActorActual()]);
  const { categorias } = await listarCatalogos(db);
  return (
    <>
      <p className="mt-1 mb-8 max-w-[65ch] text-sm text-tinta-2">
        La registrás como <strong className="text-tinta">{actor.nombre}</strong> ({actor.area}). Contá qué necesitás: con el impacto y la
        urgencia calculamos la prioridad y el plazo.
      </p>
      <FormularioSolicitud
        modo={{
          tipo: "alta",
          categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre, requiereAprobacion: c.requiereAprobacion })),
        }}
      />
    </>
  );
}
