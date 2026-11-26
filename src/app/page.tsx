import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { listarSolicitudes, type FiltroListado } from "@/services/solicitudes";
import { ESTADOS, evaluarSla, formatearCodigo, type Estado } from "@/domain/solicitud";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, formatearVencimiento } from "@/lib/formato";
import { obtenerActorActual } from "@/lib/actor";
import { Paletas } from "@/components/paletas";
import { EtiquetaEstado, Semaforo } from "@/components/semaforo";

const FILTROS_ESTADO: (Estado | undefined)[] = [undefined, "PENDIENTE_APROBACION", "NUEVA", "ASIGNADA", "EN_PROGRESO", "RESUELTA", "CERRADA"];

type Vista = "todas" | "mias" | "asignadas";

function leerEstado(valor: string | string[] | undefined): Estado | undefined {
  return typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor) ? (valor as Estado) : undefined;
}

function enlace(vista: Vista, estado?: Estado) {
  const q = new URLSearchParams();
  if (vista !== "todas") q.set("ver", vista);
  if (estado) q.set("estado", estado);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Tablero de solicitudes</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Ordenadas por vencimiento. La prioridad sale de impacto × urgencia (RN-01) y el plazo, de la prioridad (RN-02).
        </p>
      </div>
      <Suspense fallback={<TableroCargando />}>
        <Tablero searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Tablero({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const estado = leerEstado(params.estado);
  const creada = typeof params.creada === "string" ? Number(params.creada) : undefined;

  await connection();
  const ahora = new Date();
  const [{ actor }, db] = await Promise.all([obtenerActorActual(), obtenerDb()]);

  const vistas: { id: Vista; etiqueta: string }[] = [
    { id: "todas", etiqueta: "Todas" },
    { id: "mias", etiqueta: "Mis pedidos" },
    ...(actor.rol === "AGENTE" ? [{ id: "asignadas" as const, etiqueta: "Asignadas a mí" }] : []),
  ];
  const vista: Vista = vistas.some((v) => v.id === params.ver) ? (params.ver as Vista) : "todas";

  const filtro: FiltroListado = { estado };
  if (vista === "mias") filtro.solicitanteId = actor.id;
  if (vista === "asignadas") filtro.asignadoId = actor.id;
  const filas = await listarSolicitudes(db, filtro);

  const aviso =
    actor.rol === "APROBADOR"
      ? { texto: "Como aprobador, tus pendientes están en “Pendiente de aprobación”.", href: enlace("todas", "PENDIENTE_APROBACION") }
      : actor.rol === "AGENTE"
        ? { texto: "Como agente, tomá las solicitudes “Nueva” para asignártelas.", href: enlace("todas", "NUEVA") }
        : null;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <nav aria-label="Vista" className="flex flex-wrap gap-1.5">
          {vistas.map((v) => (
            <Filtro key={v.id} href={enlace(v.id, estado)} activo={v.id === vista}>
              {v.etiqueta}
            </Filtro>
          ))}
        </nav>
        <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
          {FILTROS_ESTADO.map((f) => (
            <Filtro key={f ?? "todos"} href={enlace(vista, f)} activo={f === estado} sutil>
              {f ? ETIQUETA_ESTADO[f] : "Cualquier estado"}
            </Filtro>
          ))}
        </nav>
      </div>

      {creada ? (
        <p role="status" className="mb-4 rounded border border-noche-regla bg-papel px-4 py-3 text-sm">
          Registramos <strong>{formatearCodigo(creada)}</strong>. Está resaltada en el tablero.
        </p>
      ) : aviso ? (
        <p className="mb-4 text-sm text-tinta-2">
          {aviso.texto}{" "}
          <Link href={aviso.href} className="font-bold text-noche underline">
            Ver ahora
          </Link>
        </p>
      ) : null}

      {filas.length === 0 ? (
        <div className="rounded border border-regla bg-papel px-6 py-12 text-center">
          <p className="font-bold">No hay solicitudes con estos filtros.</p>
          <p className="mt-1 text-sm text-tinta-2">Probá con otra vista o estado.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-bold text-noche underline">
            Ver todas
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-regla bg-papel">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Solicitudes ordenadas por vencimiento</caption>
            <thead>
              <tr className="border-b border-regla text-xs font-bold uppercase tracking-[0.06em] text-tinta-2">
                <th scope="col" className="w-28 px-4 py-3 sm:w-36">Vence</th>
                <th scope="col" className="px-4 py-3">Solicitud</th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Personas</th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Prioridad</th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Estado</th>
                <th scope="col" className="px-4 py-3">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((s) => {
                const sla = evaluarSla({ estado: s.estado, inicioSla: s.inicioSla, vencimiento: s.venceEn, ahora, resueltaEn: s.resueltaEn });
                const v = s.venceEn ? formatearVencimiento(s.venceEn, ahora) : null;
                const esNueva = s.id === creada;
                const terminada = s.estado === "CERRADA" || s.estado === "RECHAZADA" || s.estado === "CANCELADA";
                return (
                  <tr
                    key={s.id}
                    className={`group relative border-b border-regla last:border-b-0 hover:bg-resaltado/60 ${esNueva ? "bg-resaltado" : ""} ${terminada ? "text-tinta-2" : ""}`}
                  >
                    <td className="p-2 align-top">
                      <div className={`flex h-full flex-col rounded px-3 py-2 ${terminada ? "bg-noche-2" : "bg-noche"} text-placa`}>
                        {v ? (
                          <>
                            {esNueva ? (
                              <Paletas texto={v.hora} className="text-xl font-bold leading-none" />
                            ) : (
                              <span className="text-xl font-bold leading-none">{v.hora}</span>
                            )}
                            <span className="mt-1 text-xs text-placa-tenue">{v.dia}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl font-bold leading-none text-placa-tenue">--:--</span>
                            <span className="mt-1 text-xs text-placa-tenue">
                              {s.estado === "PENDIENTE_APROBACION" ? "espera aprobación" : "sin plazo"}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-bold text-tinta-2">{formatearCodigo(s.id)}</span>
                      {/* El enlace cubre toda la fila (after:inset-0) para que se pueda abrir desde cualquier celda. */}
                      <Link
                        href={`/solicitudes/${s.id}`}
                        className="block font-bold text-tinta no-underline after:absolute after:inset-0 group-hover:underline"
                      >
                        {s.titulo}
                      </Link>
                      <span className="text-xs text-tinta-2">{s.categoria}</span>
                      <span className="mt-1 block text-xs text-tinta-2 md:hidden">
                        {ETIQUETA_PRIORIDAD[s.prioridad]} · {ETIQUETA_ESTADO[s.estado]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 align-top md:table-cell">
                      {s.solicitante}
                      <span className="block text-xs text-tinta-2">{s.asignado ? `Atiende: ${s.asignado}` : "Sin asignar"}</span>
                    </td>
                    <td className={`hidden px-4 py-3 align-top md:table-cell ${s.prioridad === "CRITICA" || s.prioridad === "ALTA" ? "font-bold" : ""}`}>
                      {ETIQUETA_PRIORIDAD[s.prioridad]}
                    </td>
                    <td className="hidden px-4 py-3 align-top md:table-cell">
                      <EtiquetaEstado estado={s.estado} texto={ETIQUETA_ESTADO[s.estado]} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Semaforo sla={sla} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Filtro({ href, activo, sutil, children }: { href: string; activo: boolean; sutil?: boolean; children: React.ReactNode }) {
  const base = "rounded px-3 py-1.5 text-sm no-underline";
  const clase = activo
    ? `${base} bg-noche font-bold text-placa`
    : sutil
      ? `${base} text-tinta-2 hover:bg-papel hover:text-tinta`
      : `${base} border border-regla bg-papel text-tinta hover:border-tinta-2`;
  return (
    <Link href={href} aria-current={activo ? "page" : undefined} className={clase}>
      {children}
    </Link>
  );
}

function TableroCargando() {
  return (
    <div className="rounded border border-regla bg-papel px-6 py-12 text-center text-sm text-tinta-2" aria-busy="true">
      Cargando el tablero…
    </div>
  );
}
