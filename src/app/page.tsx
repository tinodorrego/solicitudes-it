import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { listarSolicitudes } from "@/services/solicitudes";
import { ESTADOS, evaluarSla, formatearCodigo, type Estado, type EstadoSla } from "@/domain/solicitud";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, ETIQUETA_SLA, formatearVencimiento } from "@/lib/formato";
import { Paletas } from "@/components/paletas";

const FILTROS: (Estado | undefined)[] = [undefined, "PENDIENTE_APROBACION", "NUEVA", "ASIGNADA", "EN_PROGRESO", "RESUELTA"];

function leerEstado(valor: string | string[] | undefined): Estado | undefined {
  return typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor) ? (valor as Estado) : undefined;
}

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Tablero de solicitudes</h1>
          <p className="mt-1 text-sm text-tinta-2">
            Ordenadas por vencimiento. La prioridad sale de impacto × urgencia (RN-01) y el plazo, de la prioridad (RN-02).
          </p>
        </div>
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
  const db = await obtenerDb();
  const filas = await listarSolicitudes(db, { estado });

  return (
    <>
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => {
          const activo = f === estado;
          return (
            <Link
              key={f ?? "todas"}
              href={f ? `/?estado=${f}` : "/"}
              aria-current={activo ? "page" : undefined}
              className={
                activo
                  ? "rounded bg-noche px-3 py-1.5 text-sm font-bold text-placa no-underline"
                  : "rounded border border-regla bg-papel px-3 py-1.5 text-sm text-tinta no-underline hover:border-tinta-2"
              }
            >
              {f ? ETIQUETA_ESTADO[f] : "Todas"}
            </Link>
          );
        })}
      </nav>

      {creada ? (
        <p role="status" className="mb-4 rounded border border-noche-regla bg-papel px-4 py-3 text-sm">
          Registramos <strong>{formatearCodigo(creada)}</strong>. Está resaltada en el tablero.
        </p>
      ) : null}

      {filas.length === 0 ? (
        <div className="rounded border border-regla bg-papel px-6 py-12 text-center">
          <p className="font-bold">{estado ? `No hay solicitudes en “${ETIQUETA_ESTADO[estado]}”.` : "Todavía no hay solicitudes."}</p>
          <p className="mt-1 text-sm text-tinta-2">Cuando registres una, aparece acá ordenada por su vencimiento.</p>
          <Link href="/solicitudes/nueva" className="mt-4 inline-block text-sm font-bold text-noche underline">
            Registrar una solicitud
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
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Solicitante</th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Prioridad</th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">Estado</th>
                <th scope="col" className="px-4 py-3">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((s) => {
                const sla = evaluarSla({ estado: s.estado, inicioSla: s.inicioSla, vencimiento: s.venceEn, ahora });
                const v = s.venceEn ? formatearVencimiento(s.venceEn, ahora) : null;
                const esNueva = s.id === creada;
                return (
                  <tr key={s.id} className={`border-b border-regla last:border-b-0 ${esNueva ? "bg-resaltado" : ""}`}>
                    <td className="p-2 align-top">
                      <div className="flex h-full flex-col rounded bg-noche px-3 py-2 text-placa">
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
                            <span className="mt-1 text-xs text-placa-tenue">espera aprobación</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-bold text-tinta-2">{formatearCodigo(s.id)}</span>
                      <span className="block font-bold">{s.titulo}</span>
                      <span className="text-xs text-tinta-2">{s.categoria}</span>
                      <span className="mt-1 block text-xs text-tinta-2 md:hidden">
                        {s.solicitante} · {ETIQUETA_PRIORIDAD[s.prioridad]} · {ETIQUETA_ESTADO[s.estado]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 align-top md:table-cell">
                      {s.solicitante}
                      <span className="block text-xs text-tinta-2">{s.area}</span>
                    </td>
                    <td className={`hidden px-4 py-3 align-top md:table-cell ${s.prioridad === "CRITICA" || s.prioridad === "ALTA" ? "font-bold" : ""}`}>
                      {ETIQUETA_PRIORIDAD[s.prioridad]}
                    </td>
                    <td className="hidden px-4 py-3 align-top md:table-cell">{ETIQUETA_ESTADO[s.estado]}</td>
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

const ESTILO_SLA: Record<EstadoSla, string> = {
  EN_TERMINO: "bg-termino-fondo text-termino",
  EN_RIESGO: "bg-riesgo-fondo text-riesgo",
  VENCIDA: "bg-vencida-fondo text-vencida",
  SIN_SLA: "bg-suelo text-tinta-2",
  CUMPLIDA: "bg-suelo text-tinta-2",
};

function Semaforo({ sla }: { sla: EstadoSla }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${ESTILO_SLA[sla]}`}>
      <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
      {ETIQUETA_SLA[sla]}
    </span>
  );
}

function TableroCargando() {
  return (
    <div className="rounded border border-regla bg-papel px-6 py-12 text-center text-sm text-tinta-2" aria-busy="true">
      Cargando el tablero…
    </div>
  );
}
