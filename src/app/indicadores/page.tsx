import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { obtenerDb } from "@/db/client";
import { obtenerIndicadores } from "@/services/indicadores";
import { PRIORIDADES } from "@/domain/solicitud";
import { ETIQUETA_PRIORIDAD } from "@/lib/formato";
import { BarrasHorizontales, ColumnasAgrupadas, ESTADO, Leyenda, SERIE, TablaDatos } from "@/components/graficos";

export const metadata: Metadata = { title: "Indicadores" };

export default function Page() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Indicadores</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-tinta-2">
          Calculados en vivo con las mismas reglas del tablero (RF-13). “Abiertas” son las que todavía requieren trabajo de IT: no
          resueltas, cerradas, rechazadas ni canceladas.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-tinta-2">Calculando indicadores…</p>}>
        <Panel />
      </Suspense>
    </>
  );
}

const diaCorto = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", timeZone: "UTC" });

function porcentaje(x: number) {
  return `${Math.round(x * 100)} %`;
}

async function Panel() {
  await connection();
  const db = await obtenerDb();
  const ind = await obtenerIndicadores(db, new Date());

  const prioridades = PRIORIDADES.map((p) => {
    const d = ind.abiertasPorPrioridad[p];
    return {
      etiqueta: ETIQUETA_PRIORIDAD[p],
      segmentos: [
        { nombre: "Vencidas", valor: d.vencidas, color: ESTADO.vencida },
        { nombre: "En riesgo", valor: d.enRiesgo, color: ESTADO.riesgo },
        { nombre: "En término o sin SLA", valor: d.total - d.vencidas - d.enRiesgo, color: ESTADO.termino },
      ],
    };
  });

  const dias = ind.ultimosDias.map((d) => ({ ...d, etiqueta: diaCorto.format(new Date(`${d.dia}T12:00:00Z`)) }));

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Resumen" className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className="flex flex-col justify-between rounded bg-noche p-6 text-placa">
          <h2 className="text-sm text-placa-tenue">Cumplimiento de SLA</h2>
          <p className="mt-2 text-6xl font-bold tracking-[-0.03em] text-ambar-placa" style={{ fontVariantNumeric: "proportional-nums" }}>
            {ind.cumplimientoSla === null ? "—" : porcentaje(ind.cumplimientoSla)}
          </p>
          <p className="mt-2 text-sm text-placa-tenue">
            {ind.resueltas
              ? `${ind.cumplidas} de ${ind.resueltas} resueltas dentro del plazo comprometido (RN-02).`
              : "Todavía no hay solicitudes resueltas con plazo."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-regla bg-regla sm:grid-cols-3">
          <Dato rotulo="Abiertas" valor={ind.abiertas} href="/" />
          <Dato rotulo="Vencidas" valor={ind.vencidas} estado="vencida" href="/" />
          <Dato rotulo="En riesgo" valor={ind.enRiesgo} estado="riesgo" href="/" />
          <Dato rotulo="Esperan aprobación" valor={ind.pendientesAprobacion} href="/?estado=PENDIENTE_APROBACION" />
          <Dato
            rotulo="Tiempo medio de resolución"
            valor={ind.horasPromedioResolucion === null ? "—" : `${ind.horasPromedioResolucion.toFixed(1).replace(".", ",")} h`}
          />
          <Dato rotulo="Resueltas" valor={ind.resueltas} href="/?estado=RESUELTA" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Abiertas por prioridad" subtitulo="Cuántas hay en cada prioridad y cómo vienen con el plazo (RN-05).">
          <div className="mb-4">
            <Leyenda
              items={[
                { nombre: "Vencidas", color: ESTADO.vencida },
                { nombre: "En riesgo", color: ESTADO.riesgo },
                { nombre: "En término o sin SLA", color: ESTADO.termino },
              ]}
            />
          </div>
          <BarrasHorizontales filas={prioridades} />
          <TablaDatos
            columnas={["Prioridad", "Abiertas", "Vencidas", "En riesgo"]}
            filas={PRIORIDADES.map((p) => [
              ETIQUETA_PRIORIDAD[p],
              ind.abiertasPorPrioridad[p].total,
              ind.abiertasPorPrioridad[p].vencidas,
              ind.abiertasPorPrioridad[p].enRiesgo,
            ])}
          />
        </Tarjeta>

        <Tarjeta titulo="Carga por agente" subtitulo="Solicitudes abiertas asignadas a cada agente.">
          <div className="mb-4">
            <Leyenda
              items={[
                { nombre: "Asignadas, sin empezar", color: SERIE.a },
                { nombre: "En progreso", color: SERIE.b },
              ]}
            />
          </div>
          <BarrasHorizontales
            filas={ind.cargaPorAgente.map((a) => ({
              etiqueta: a.agente,
              detalle: a.vencidas ? `${a.vencidas} vencida${a.vencidas > 1 ? "s" : ""}` : undefined,
              segmentos: [
                { nombre: "Asignadas, sin empezar", valor: a.asignadas, color: SERIE.a },
                { nombre: "En progreso", valor: a.enProgreso, color: SERIE.b },
              ],
            }))}
          />
          <TablaDatos
            columnas={["Agente", "Sin empezar", "En progreso", "Vencidas"]}
            filas={ind.cargaPorAgente.map((a) => [a.agente, a.asignadas, a.enProgreso, a.vencidas])}
          />
        </Tarjeta>

        <Tarjeta titulo="Creadas y resueltas" subtitulo="Últimos 7 días. Si las creadas superan a las resueltas, la cola crece.">
          <div className="mb-4">
            <Leyenda
              items={[
                { nombre: "Creadas", color: SERIE.a },
                { nombre: "Resueltas", color: SERIE.b },
              ]}
            />
          </div>
          <ColumnasAgrupadas
            series={[
              { nombre: "Creadas", color: SERIE.a },
              { nombre: "Resueltas", color: SERIE.b },
            ]}
            grupos={dias.map((d) => ({ etiqueta: d.etiqueta, valores: [d.creadas, d.resueltas] }))}
          />
          <TablaDatos columnas={["Día", "Creadas", "Resueltas"]} filas={dias.map((d) => [d.etiqueta, d.creadas, d.resueltas])} />
        </Tarjeta>

        <Tarjeta titulo="Solicitudes por tipo de pedido" subtitulo="Total histórico; entre paréntesis, las abiertas.">
          <BarrasHorizontales
            filas={ind.porCategoria.map((c) => ({
              etiqueta: c.categoria,
              detalle: `${c.abiertas} abierta${c.abiertas === 1 ? "" : "s"}`,
              segmentos: [{ nombre: "Total", valor: c.total, color: SERIE.a }],
            }))}
          />
          <TablaDatos columnas={["Tipo", "Total", "Abiertas"]} filas={ind.porCategoria.map((c) => [c.categoria, c.total, c.abiertas])} />
        </Tarjeta>
      </div>
    </div>
  );
}

function Dato({
  rotulo,
  valor,
  estado,
  href,
}: {
  rotulo: string;
  valor: number | string;
  estado?: "vencida" | "riesgo";
  href?: string;
}) {
  const contenido = (
    <>
      <p className="flex items-center gap-1.5 text-sm text-tinta-2">
        {estado ? (
          <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="4" fill={estado === "vencida" ? ESTADO.vencida : ESTADO.riesgo} />
          </svg>
        ) : null}
        {rotulo}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-[-0.02em]" style={{ fontVariantNumeric: "proportional-nums" }}>
        {valor}
      </p>
    </>
  );
  return (
    <div className="bg-papel">
      {href ? (
        <Link href={href} className="block h-full p-4 text-tinta no-underline hover:bg-resaltado">
          {contenido}
        </Link>
      ) : (
        <div className="p-4">{contenido}</div>
      )}
    </div>
  );
}

function Tarjeta({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-regla bg-papel p-5">
      <h2 className="font-bold">{titulo}</h2>
      <p className="mb-4 text-sm text-tinta-2">{subtitulo}</p>
      {children}
    </section>
  );
}
