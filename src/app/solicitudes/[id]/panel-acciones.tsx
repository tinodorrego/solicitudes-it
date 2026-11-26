"use client";

import { useActionState } from "react";
import { DEFINICION_ACCIONES, type Accion } from "@/domain/acciones";
import { ejecutarAccionForm, type Respuesta } from "./acciones";

const AYUDA: Partial<Record<Accion, string>> = {
  APROBAR: "El plazo de resolución empieza a correr ahora (RN-03).",
  RECHAZAR: "Contale al solicitante por qué.",
  RESOLVER: "Contá qué se hizo: el solicitante lo va a leer para confirmar.",
  REABRIR: "Contá qué sigue fallando.",
  CANCELAR: "Contá por qué ya no hace falta.",
  CERRAR: "Confirmás que quedó resuelto.",
};

/** Acciones secundarias: se muestran con borde en vez de relleno. */
const SECUNDARIAS: Accion[] = ["RECHAZAR", "REABRIR", "CANCELAR"];

export function PanelAcciones({
  solicitudId,
  acciones,
  agentes,
  actorId,
}: {
  solicitudId: number;
  acciones: Accion[];
  agentes: { id: number; nombre: string }[];
  actorId: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {acciones.map((a) => (
        <FormAccion key={a} solicitudId={solicitudId} accion={a} agentes={agentes} actorId={actorId} />
      ))}
    </div>
  );
}

function FormAccion({
  solicitudId,
  accion,
  agentes,
  actorId,
}: {
  solicitudId: number;
  accion: Accion;
  agentes: { id: number; nombre: string }[];
  actorId: number;
}) {
  const [estado, enviar, enviando] = useActionState<Respuesta, FormData>(ejecutarAccionForm, {});
  const def = DEFINICION_ACCIONES[accion];
  const secundaria = SECUNDARIAS.includes(accion);
  const idMotivo = `motivo-${accion}`;

  return (
    <form action={enviar} className="flex flex-col gap-2 rounded border border-regla bg-papel p-3">
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <input type="hidden" name="accion" value={accion} />

      {accion === "ASIGNAR" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold">Asignar a</span>
          <select name="asignadoId" defaultValue={actorId} className="rounded border border-regla bg-papel px-2 py-1.5">
            {agentes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.id === actorId ? `${g.nombre} (yo)` : g.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {def.motivo === "obligatorio" ? (
        <label htmlFor={idMotivo} className="flex flex-col gap-1 text-sm">
          <span className="font-bold">{accion === "RESOLVER" ? "Cómo se resolvió" : "Motivo"}</span>
          <textarea
            id={idMotivo}
            name="motivo"
            rows={2}
            required
            maxLength={1000}
            className="rounded border border-regla bg-white px-2 py-1.5 text-base"
          />
        </label>
      ) : null}

      {AYUDA[accion] ? <p className="text-xs text-tinta-2">{AYUDA[accion]}</p> : null}

      <button
        type="submit"
        disabled={enviando}
        className={
          secundaria
            ? "self-start rounded border border-tinta-2 px-4 py-2 text-sm font-bold text-tinta hover:border-tinta disabled:opacity-60"
            : "self-start rounded bg-noche px-4 py-2 text-sm font-bold text-placa hover:bg-noche-2 disabled:opacity-60"
        }
      >
        {enviando ? "Guardando…" : def.etiqueta}
      </button>
      {estado.error ? (
        <p role="alert" className="text-sm font-bold text-vencida">
          {estado.error}
        </p>
      ) : null}
    </form>
  );
}
