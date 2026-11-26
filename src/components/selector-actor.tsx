"use client";

import { cambiarActor } from "@/app/actions";
import { ETIQUETA_ROL } from "@/lib/formato";

type Usuario = { id: number; nombre: string; rol: keyof typeof ETIQUETA_ROL };

export function SelectorActor({ usuarios, actualId }: { usuarios: Usuario[]; actualId: number }) {
  const roles = Object.keys(ETIQUETA_ROL) as (keyof typeof ETIQUETA_ROL)[];

  return (
    <form action={cambiarActor} className="flex items-center gap-2">
      <label htmlFor="actor" className="text-xs text-placa-tenue">
        Actuando como
      </label>
      <select
        id="actor"
        name="actor"
        defaultValue={actualId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-48 rounded border border-noche-regla bg-noche-2 px-2 py-1.5 text-sm text-placa"
      >
        {roles.map((rol) => (
          <optgroup key={rol} label={ETIQUETA_ROL[rol]}>
            {usuarios
              .filter((u) => u.rol === rol)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-sm underline">
          Cambiar
        </button>
      </noscript>
    </form>
  );
}
