import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { obtenerSolicitud } from "@/services/solicitudes";
import { puedeEditar } from "@/domain/acciones";
import { formatearCodigo } from "@/domain/solicitud";
import { obtenerActorActual } from "@/lib/actor";
import { FormularioSolicitud } from "../../nueva/formulario";

export const metadata: Metadata = { title: "Editar solicitud" };

export default function Page({ params }: PageProps<"/solicitudes/[id]/editar">) {
  return (
    <Suspense fallback={<p className="text-sm text-tinta-2">Cargando…</p>}>
      <Edicion params={params} />
    </Suspense>
  );
}

async function Edicion({ params }: { params: PageProps<"/solicitudes/[id]/editar">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  await connection();
  const [db, { actor }] = await Promise.all([obtenerDb(), obtenerActorActual()]);
  const s = await obtenerSolicitud(db, id);
  if (!s) notFound();
  const permiso = puedeEditar(s, { id: actor.id, rol: actor.rol });

  return (
    <>
      <Link href={`/solicitudes/${s.id}`} className="text-sm text-tinta-2 underline hover:text-tinta">
        ← Volver a {formatearCodigo(s.id)}
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em]">Editar {formatearCodigo(s.id)}</h1>
      {permiso.ok ? (
        <>
          <p className="mt-1 mb-8 max-w-[65ch] text-sm text-tinta-2">
            Podés corregir el pedido hasta que alguien de la mesa de ayuda lo tome (RF-11). El cambio queda registrado en el seguimiento.
          </p>
          <FormularioSolicitud
            modo={{
              tipo: "edicion",
              solicitudId: s.id,
              categoria: { id: s.categoriaId, nombre: s.categoria, requiereAprobacion: s.requiereAprobacion },
              inicial: { titulo: s.titulo, descripcion: s.descripcion, impacto: s.impacto, urgencia: s.urgencia },
            }}
          />
        </>
      ) : (
        <p className="mt-4 rounded border border-regla bg-papel p-4 text-sm">{permiso.motivo}</p>
      )}
    </>
  );
}
