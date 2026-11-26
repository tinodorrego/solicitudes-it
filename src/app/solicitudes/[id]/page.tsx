import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { listarUsuarios, obtenerSeguimiento, obtenerSolicitud, type EventoSeguimiento } from "@/services/solicitudes";
import { evaluarSla, formatearCodigo, SLA_HORAS, type Estado } from "@/domain/solicitud";
import { accionesDisponibles, DEFINICION_ACCIONES, puedeComentar, puedeEditar, ACCIONES } from "@/domain/acciones";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_NIVEL,
  ETIQUETA_URGENCIA,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_ROL,
  formatearFechaHora,
  formatearHoras,
  formatearVencimiento,
} from "@/lib/formato";
import { obtenerActorActual } from "@/lib/actor";
import { EtiquetaEstado, Semaforo } from "@/components/semaforo";
import { PanelAcciones } from "./panel-acciones";
import { FormComentario } from "./form-comentario";

export const metadata: Metadata = { title: "Solicitud" };

export default function Page({ params }: PageProps<"/solicitudes/[id]">) {
  return (
    <>
      <Link href="/" className="text-sm text-tinta-2 underline hover:text-tinta">
        ← Volver al tablero
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-tinta-2">Cargando la solicitud…</p>}>
        <Detalle params={params} />
      </Suspense>
    </>
  );
}

async function Detalle({ params }: { params: PageProps<"/solicitudes/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  await connection();
  const ahora = new Date();
  const [{ actor }, db] = await Promise.all([obtenerActorActual(), obtenerDb()]);
  const [s, seguimiento, usuarios] = await Promise.all([obtenerSolicitud(db, id), obtenerSeguimiento(db, id), listarUsuarios(db)]);
  if (!s) notFound();

  const sla = evaluarSla({ estado: s.estado, inicioSla: s.inicioSla, vencimiento: s.venceEn, ahora, resueltaEn: s.resueltaEn });
  const v = s.venceEn ? formatearVencimiento(s.venceEn, ahora) : null;
  const actorPermisos = { id: actor.id, rol: actor.rol };
  const acciones = accionesDisponibles(s, actorPermisos);
  const edicion = puedeEditar(s, actorPermisos);
  const agentes = usuarios.filter((u) => u.rol === "AGENTE").map((u) => ({ id: u.id, nombre: u.nombre }));

  return (
    <div className="mt-4">
      <div className="mb-8 flex flex-col gap-2">
        <span className="text-sm font-bold text-tinta-2">
          {formatearCodigo(s.id)} · {s.categoria}
        </span>
        <h1 className="max-w-[40ch] text-2xl font-bold tracking-[-0.02em] text-balance">{s.titulo}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <EtiquetaEstado estado={s.estado} texto={ETIQUETA_ESTADO[s.estado]} />
          <Semaforo sla={sla} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="detalle">
            <h2 id="detalle" className="mb-2 text-lg font-bold">
              Detalle
            </h2>
            <p className="max-w-[70ch] whitespace-pre-line">{s.descripcion}</p>
            <p className="mt-3 text-sm text-tinta-2">
              Pedida por <strong className="text-tinta">{s.solicitante}</strong> ({s.area}) el {formatearFechaHora(s.creadaEn)}.
            </p>
          </section>

          <section aria-labelledby="seguimiento">
            <h2 id="seguimiento" className="mb-4 text-lg font-bold">
              Seguimiento
            </h2>
            <ol className="flex flex-col border-l-2 border-regla">
              {seguimiento.map((e) => (
                <Evento key={e.id} evento={e} />
              ))}
            </ol>
            <div className="mt-6">
              {puedeComentar(s.estado) ? (
                <FormComentario solicitudId={s.id} />
              ) : (
                <p className="text-sm text-tinta-2">La solicitud terminó: ya no admite comentarios.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <dl className="rounded bg-noche p-5 text-placa">
            <div className="flex flex-col gap-1 pb-3">
              <dt className="text-xs text-placa-tenue">Vence</dt>
              <dd className="text-2xl font-bold leading-tight text-ambar-placa">
                {v ? `${v.hora} · ${v.dia}` : s.estado === "PENDIENTE_APROBACION" ? "Espera aprobación" : "Sin plazo"}
              </dd>
            </div>
            <Fila rotulo="Prioridad" regla="RN-01">
              {ETIQUETA_PRIORIDAD[s.prioridad]}
              <span className="block text-xs font-normal text-placa-tenue">
                Impacto {ETIQUETA_NIVEL[s.impacto].toLowerCase()} × urgencia {ETIQUETA_URGENCIA[s.urgencia].toLowerCase()}
              </span>
            </Fila>
            <Fila rotulo="Plazo comprometido" regla="RN-02">
              {formatearHoras(SLA_HORAS[s.prioridad])}
              {s.inicioSla ? (
                <span className="block text-xs font-normal text-placa-tenue">desde {formatearFechaHora(s.inicioSla)}</span>
              ) : null}
            </Fila>
            <Fila rotulo="Atiende" regla="RF-08">
              {s.asignado ?? "Sin asignar"}
            </Fila>
          </dl>

          <section aria-labelledby="acciones" className="flex flex-col gap-3">
            <h2 id="acciones" className="text-lg font-bold">
              Qué podés hacer
            </h2>
            <p className="text-sm text-tinta-2">
              Estás actuando como <strong className="text-tinta">{actor.nombre}</strong> ({ETIQUETA_ROL[actor.rol].toLowerCase()}).
            </p>
            {edicion.ok ? (
              <Link
                href={`/solicitudes/${s.id}/editar`}
                className="self-start rounded border border-tinta-2 px-4 py-2 text-sm font-bold text-tinta no-underline hover:border-tinta"
              >
                Editar la solicitud
              </Link>
            ) : null}
            {acciones.length ? (
              <PanelAcciones solicitudId={s.id} acciones={acciones} agentes={agentes} actorId={actor.id} />
            ) : !edicion.ok ? (
              <p className="rounded border border-regla bg-papel p-3 text-sm text-tinta-2">
                {sinAcciones(s.estado, actor.rol, s.solicitanteId === actor.id, s.asignado)}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function sinAcciones(estado: Estado, rol: string, esDuenio: boolean, asignado: string | null): string {
  if (estado === "CERRADA" || estado === "RECHAZADA" || estado === "CANCELADA") return "La solicitud terminó. No hay más acciones.";
  if (estado === "PENDIENTE_APROBACION") return "Espera la aprobación de Gerencia IT. Cambiá a un aprobador arriba para aprobarla o rechazarla.";
  if (esDuenio) return asignado ? `La está atendiendo ${asignado}. Podés dejar un comentario.` : "Espera que la tome un agente. Podés dejar un comentario.";
  if (rol === "SOLICITANTE") return "Es el pedido de otra persona: solo podés comentar (RN-06).";
  return "En este estado la acción le corresponde a otra persona (RN-06). Podés cambiar de usuario arriba.";
}

function Fila({ rotulo, regla, children }: { rotulo: string; regla: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-noche-regla py-3 last:pb-0">
      <dt className="flex justify-between text-xs text-placa-tenue">
        <span>{rotulo}</span>
        <span>{regla}</span>
      </dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

const VERBO: Record<(typeof ACCIONES)[number], string> = {
  APROBAR: "aprobó",
  RECHAZAR: "rechazó",
  ASIGNAR: "asignó",
  INICIAR: "empezó a trabajar",
  RESOLVER: "resolvió",
  CERRAR: "confirmó y cerró",
  REABRIR: "reabrió",
  CANCELAR: "canceló",
};

function verboTransicion(desde: Estado | null, hacia: Estado): string {
  if (!desde) return "registró la solicitud";
  const accion = ACCIONES.find((a) => DEFINICION_ACCIONES[a].desde.includes(desde) && DEFINICION_ACCIONES[a].hacia === hacia);
  return accion ? VERBO[accion] : "cambió el estado";
}

function Evento({ evento: e }: { evento: EventoSeguimiento }) {
  return (
    <li className="relative pb-5 pl-5 last:pb-0">
      <span
        aria-hidden="true"
        className={`absolute -left-[7px] top-1.5 size-3 rounded-full border-2 ${
          e.tipo === "ESTADO" ? "border-noche bg-noche" : "border-tinta-2 bg-suelo"
        }`}
      />
      <p className="text-xs text-tinta-2">
        <time dateTime={e.en.toISOString()}>{formatearFechaHora(e.en)}</time>
      </p>
      {e.tipo === "ESTADO" ? (
        <>
          <p className="text-sm">
            <strong>{e.autor}</strong> {verboTransicion(e.desde, e.hacia)} → <strong>{ETIQUETA_ESTADO[e.hacia]}</strong>
          </p>
          {e.motivo ? <p className="mt-1 max-w-[70ch] rounded bg-papel px-3 py-2 text-sm">{e.motivo}</p> : null}
        </>
      ) : e.tipo === "EDICION" ? (
        <p className="text-sm text-tinta-2">
          <strong className="text-tinta">{e.autor}</strong> {e.texto.charAt(0).toLowerCase() + e.texto.slice(1)}
        </p>
      ) : (
        <>
          <p className="text-sm">
            <strong>{e.autor}</strong> comentó
          </p>
          <p className="mt-1 max-w-[70ch] whitespace-pre-line rounded border border-regla bg-papel px-3 py-2 text-sm">{e.texto}</p>
        </>
      )}
    </li>
  );
}
