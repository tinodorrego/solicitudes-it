/**
 * RF-13 — Indicadores de gestión. Se calculan con las mismas reglas que ve el
 * usuario en pantalla (evaluarSla), para que el tablero y el dashboard no se contradigan.
 */
import type { Db } from "@/db/client";
import { evaluarSla, esEstadoFinal, PRIORIDADES, type Prioridad } from "@/domain/solicitud";
import { listarSolicitudes, listarUsuarios } from "./solicitudes";

export type Indicadores = {
  abiertas: number;
  pendientesAprobacion: number;
  enRiesgo: number;
  vencidas: number;
  resueltas: number;
  cumplidas: number;
  /** null cuando todavía no hay solicitudes resueltas con SLA. */
  cumplimientoSla: number | null;
  /** Horas promedio entre inicio del SLA y resolución. */
  horasPromedioResolucion: number | null;
  abiertasPorPrioridad: Record<Prioridad, { total: number; vencidas: number; enRiesgo: number }>;
  porCategoria: { categoria: string; total: number; abiertas: number }[];
  cargaPorAgente: { agente: string; asignadas: number; enProgreso: number; vencidas: number }[];
  ultimosDias: { dia: string; creadas: number; resueltas: number }[];
};

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

/** Abierta = todavía requiere trabajo de IT (no resuelta ni en estado final). */
export function estaAbierta(estado: Parameters<typeof esEstadoFinal>[0]) {
  return !esEstadoFinal(estado) && estado !== "RESUELTA";
}

export async function obtenerIndicadores(db: Db, ahora: Date = new Date(), dias = 7): Promise<Indicadores> {
  const [filas, usuarios] = await Promise.all([listarSolicitudes(db), listarUsuarios(db)]);

  const abiertasPorPrioridad = Object.fromEntries(
    PRIORIDADES.map((p) => [p, { total: 0, vencidas: 0, enRiesgo: 0 }]),
  ) as Indicadores["abiertasPorPrioridad"];
  const categorias = new Map<string, { total: number; abiertas: number }>();
  const agentes = new Map(
    usuarios.filter((u) => u.rol === "AGENTE").map((u) => [u.id, { agente: u.nombre, asignadas: 0, enProgreso: 0, vencidas: 0 }]),
  );

  let abiertas = 0, pendientesAprobacion = 0, enRiesgo = 0, vencidas = 0, resueltas = 0, cumplidas = 0;
  let horasResolucion = 0;

  for (const s of filas) {
    const sla = evaluarSla({ estado: s.estado, inicioSla: s.inicioSla, vencimiento: s.venceEn, ahora, resueltaEn: s.resueltaEn });
    const cat = categorias.get(s.categoria) ?? { total: 0, abiertas: 0 };
    cat.total++;

    if (estaAbierta(s.estado)) {
      abiertas++;
      cat.abiertas++;
      if (s.estado === "PENDIENTE_APROBACION") pendientesAprobacion++;
      const p = abiertasPorPrioridad[s.prioridad];
      p.total++;
      if (sla === "VENCIDA") {
        vencidas++;
        p.vencidas++;
      }
      if (sla === "EN_RIESGO") {
        enRiesgo++;
        p.enRiesgo++;
      }
      const agente = s.asignadoId ? agentes.get(s.asignadoId) : undefined;
      if (agente) {
        if (s.estado === "EN_PROGRESO") agente.enProgreso++;
        else agente.asignadas++;
        if (sla === "VENCIDA") agente.vencidas++;
      }
    }

    if ((sla === "CUMPLIDA" || sla === "INCUMPLIDA") && s.resueltaEn && s.inicioSla) {
      resueltas++;
      if (sla === "CUMPLIDA") cumplidas++;
      horasResolucion += (s.resueltaEn.getTime() - s.inicioSla.getTime()) / HORA;
    }
    categorias.set(s.categoria, cat);
  }

  // Serie diaria de creadas vs. resueltas (últimos `dias` días, en hora de Argentina).
  const clave = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const ultimosDias = Array.from({ length: dias }, (_, i) => {
    const d = new Date(ahora.getTime() - (dias - 1 - i) * DIA);
    return { dia: clave.format(d), creadas: 0, resueltas: 0 };
  });
  const indice = new Map(ultimosDias.map((d, i) => [d.dia, i]));
  for (const s of filas) {
    const c = indice.get(clave.format(s.creadaEn));
    if (c !== undefined) ultimosDias[c].creadas++;
    if (s.resueltaEn) {
      const r = indice.get(clave.format(s.resueltaEn));
      if (r !== undefined) ultimosDias[r].resueltas++;
    }
  }

  return {
    abiertas,
    pendientesAprobacion,
    enRiesgo,
    vencidas,
    resueltas,
    cumplidas,
    cumplimientoSla: resueltas ? cumplidas / resueltas : null,
    horasPromedioResolucion: resueltas ? horasResolucion / resueltas : null,
    abiertasPorPrioridad,
    porCategoria: [...categorias].map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.total - a.total),
    cargaPorAgente: [...agentes.values()],
    ultimosDias,
  };
}
