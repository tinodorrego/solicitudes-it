import type { EstadoSla } from "@/domain/solicitud";
import { ETIQUETA_SLA } from "@/lib/formato";

const ESTILO_SLA: Record<EstadoSla, string> = {
  EN_TERMINO: "bg-termino-fondo text-termino",
  EN_RIESGO: "bg-riesgo-fondo text-riesgo",
  VENCIDA: "bg-vencida-fondo text-vencida",
  INCUMPLIDA: "bg-vencida-fondo text-vencida",
  CUMPLIDA: "bg-termino-fondo text-termino",
  SIN_SLA: "bg-suelo text-tinta-2",
};

/** RF-10 / RN-05 */
export function Semaforo({ sla }: { sla: EstadoSla }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${ESTILO_SLA[sla]}`}>
      <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
        {sla === "CUMPLIDA" || sla === "INCUMPLIDA" ? (
          <rect x="0.5" y="0.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        ) : (
          <circle cx="4" cy="4" r="4" fill="currentColor" />
        )}
      </svg>
      {ETIQUETA_SLA[sla]}
    </span>
  );
}

const ESTILO_ESTADO: Record<string, string> = {
  PENDIENTE_APROBACION: "border-noche-regla text-noche",
  RECHAZADA: "border-regla text-tinta-2 line-through",
  CANCELADA: "border-regla text-tinta-2 line-through",
  CERRADA: "border-regla text-tinta-2",
};

export function EtiquetaEstado({ estado, texto }: { estado: string; texto: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-bold ${ESTILO_ESTADO[estado] ?? "border-tinta-2 text-tinta"}`}>
      {texto}
    </span>
  );
}
