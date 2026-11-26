import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { listarCatalogos } from "@/services/solicitudes";
import { FormularioSolicitud } from "./formulario";

export const metadata: Metadata = { title: "Nueva solicitud" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Nueva solicitud</h1>
      <p className="mt-1 mb-8 max-w-[65ch] text-sm text-tinta-2">
        Contá qué necesitás. No hace falta saber de sistemas: con el impacto y la urgencia calculamos la prioridad y el plazo.
      </p>
      <Suspense fallback={<p className="text-sm text-tinta-2">Cargando el formulario…</p>}>
        <Formulario />
      </Suspense>
    </>
  );
}

async function Formulario() {
  await connection();
  const db = await obtenerDb();
  const { categorias, solicitantes } = await listarCatalogos(db);
  return (
    <FormularioSolicitud
      categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, requiereAprobacion: c.requiereAprobacion }))}
      solicitantes={solicitantes.map((u) => ({ id: u.id, nombre: u.nombre, area: u.area }))}
    />
  );
}
