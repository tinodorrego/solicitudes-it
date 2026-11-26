"use client";

import { useActionState } from "react";
import { comentarForm, type Respuesta } from "./acciones";

export function FormComentario({ solicitudId }: { solicitudId: number }) {
  const [estado, enviar, enviando] = useActionState<Respuesta, FormData>(comentarForm, {});
  return (
    <form action={enviar} className="flex flex-col gap-2">
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <label htmlFor="texto" className="font-bold">
        Agregar un comentario
      </label>
      <textarea
        id="texto"
        name="texto"
        rows={3}
        required
        maxLength={1000}
        aria-describedby="comentario-estado"
        className="rounded border border-regla bg-papel px-3 py-2 text-base hover:border-tinta-2"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-noche px-4 py-2 text-sm font-bold text-placa hover:bg-noche-2 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Comentar"}
        </button>
        <p id="comentario-estado" role="status" className={`text-sm ${estado.error ? "font-bold text-vencida" : "text-tinta-2"}`}>
          {estado.error ?? estado.ok}
        </p>
      </div>
    </form>
  );
}
