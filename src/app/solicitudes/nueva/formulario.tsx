"use client";

import { useActionState, useState } from "react";
import { calcularPrioridad, estadoInicial, SLA_HORAS, type Nivel } from "@/domain/solicitud";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, formatearHoras } from "@/lib/formato";
import { Paletas } from "@/components/paletas";
import { registrarSolicitud } from "./actions";
import { editarForm } from "../[id]/acciones";

type Categoria = { id: number; nombre: string; requiereAprobacion: boolean };
type EstadoFormulario = { errores?: Partial<Record<string, string[]>>; mensaje?: string; error?: string; valores?: Record<string, string> };

type Modo =
  | { tipo: "alta"; categorias: Categoria[] }
  | {
      tipo: "edicion";
      solicitudId: number;
      categoria: Categoria;
      inicial: { titulo: string; descripcion: string; impacto: Nivel; urgencia: Nivel };
    };

const IMPACTO: { valor: Nivel; titulo: string; ayuda: string }[] = [
  { valor: "ALTO", titulo: "Alto", ayuda: "Un área entera o clientes" },
  { valor: "MEDIO", titulo: "Medio", ayuda: "Varias personas" },
  { valor: "BAJO", titulo: "Bajo", ayuda: "Solo a mí" },
];

const URGENCIA: { valor: Nivel; titulo: string; ayuda: string }[] = [
  { valor: "ALTO", titulo: "Alta", ayuda: "Frena el trabajo ahora" },
  { valor: "MEDIO", titulo: "Media", ayuda: "Molesta, pero se puede seguir" },
  { valor: "BAJO", titulo: "Baja", ayuda: "Puede esperar unos días" },
];

const campo =
  "w-full rounded border border-regla bg-papel px-3 py-2 text-base text-tinta placeholder:text-tinta-2 hover:border-tinta-2 aria-invalid:border-vencida";

export function FormularioSolicitud({ modo }: { modo: Modo }) {
  const edicion = modo.tipo === "edicion";
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(edicion ? editarForm : registrarSolicitud, {});
  const v = estado.valores ?? (edicion ? modo.inicial : {});
  const categorias = edicion ? [modo.categoria] : modo.categorias;

  const [categoriaId, setCategoriaId] = useState(edicion ? String(modo.categoria.id) : (v as Record<string, string>).categoriaId ?? "");
  const [impacto, setImpacto] = useState<Nivel | "">((v.impacto as Nivel) ?? "");
  const [urgencia, setUrgencia] = useState<Nivel | "">((v.urgencia as Nivel) ?? "");
  const mensaje = estado.mensaje ?? estado.error;

  const categoria = categorias.find((c) => String(c.id) === categoriaId);
  const prioridad = impacto && urgencia ? calcularPrioridad(impacto, urgencia) : null;
  const inicial = categoria ? estadoInicial(categoria.requiereAprobacion) : null;
  // Un error deja de mostrarse en cuanto la persona corrige ese campo.
  const [corregidos, setCorregidos] = useState<ReadonlySet<string>>(new Set());
  const err = Object.fromEntries(Object.entries(estado.errores ?? {}).filter(([k]) => !corregidos.has(k)));

  return (
    <form
      action={accion}
      noValidate
      onChange={(e) => {
        const objetivo = e.target as EventTarget;
        const nombre = objetivo instanceof HTMLInputElement || objetivo instanceof HTMLTextAreaElement || objetivo instanceof HTMLSelectElement ? objetivo.name : "";
        if (nombre && !corregidos.has(nombre)) setCorregidos(new Set(corregidos).add(nombre));
      }}
      onSubmit={() => setCorregidos(new Set())}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="flex flex-col gap-6">
        {edicion ? <input type="hidden" name="solicitudId" value={modo.solicitudId} /> : null}
        {mensaje ? (
          <p role="alert" className="rounded border border-vencida bg-vencida-fondo px-4 py-3 text-sm text-vencida">
            {mensaje}
          </p>
        ) : null}

        <Campo id="titulo" etiqueta="Qué necesitás" ayuda="Una frase corta. Ej.: “No puedo entrar a la VPN”." errores={err.titulo}>
          <input
            id="titulo"
            name="titulo"
            required
            minLength={5}
            maxLength={120}
            defaultValue={v.titulo}
            aria-invalid={err.titulo ? true : undefined}
            aria-describedby="titulo-ayuda titulo-error"
            className={campo}
          />
        </Campo>

        <Campo id="descripcion" etiqueta="Detalle" ayuda="Qué pasa, desde cuándo y qué probaste." errores={err.descripcion}>
          <textarea
            id="descripcion"
            name="descripcion"
            required
            rows={5}
            maxLength={2000}
            defaultValue={v.descripcion}
            aria-invalid={err.descripcion ? true : undefined}
            aria-describedby="descripcion-ayuda descripcion-error"
            className={`${campo} resize-y`}
          />
        </Campo>

        {edicion ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold">Tipo de pedido</span>
            <p>{modo.categoria.nombre}</p>
            <p className="text-sm text-tinta-2">No se puede cambiar: si te equivocaste de tipo, cancelá el pedido y creá otro.</p>
          </div>
        ) : (
          <Campo id="categoriaId" etiqueta="Tipo de pedido" errores={err.categoriaId}>
            <select
              id="categoriaId"
              name="categoriaId"
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              aria-invalid={err.categoriaId ? true : undefined}
              aria-describedby="categoriaId-error"
              className={`${campo} sm:max-w-sm`}
            >
              <option value="" disabled>
                Elegí una opción
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.requiereAprobacion ? " (requiere aprobación)" : ""}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Escala nombre="impacto" leyenda="¿A quiénes afecta?" opciones={IMPACTO} valor={impacto} onChange={setImpacto} errores={err.impacto} />
        <Escala nombre="urgencia" leyenda="¿Cuánto puede esperar?" opciones={URGENCIA} valor={urgencia} onChange={setUrgencia} errores={err.urgencia} />

        <div>
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-noche px-5 py-2.5 font-bold text-placa transition-colors hover:bg-noche-2 disabled:cursor-wait disabled:opacity-70"
          >
            {enviando ? "Guardando…" : edicion ? "Guardar cambios" : "Registrar solicitud"}
          </button>
        </div>
      </div>

      <aside aria-labelledby="lectura-titulo" className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded bg-noche p-5 text-placa">
          <h2 id="lectura-titulo" className="text-xs font-bold uppercase tracking-[0.08em] text-placa-tenue">
            Lo que calcula el sistema
          </h2>
          <dl aria-live="polite" className="mt-4 flex flex-col divide-y divide-noche-regla">
            <Lectura rotulo="Prioridad" regla="RN-01" valor={prioridad ? ETIQUETA_PRIORIDAD[prioridad].toUpperCase() : "--"} />
            <Lectura
              rotulo="Se resuelve en"
              regla="RN-02"
              valor={prioridad ? formatearHoras(SLA_HORAS[prioridad]).toUpperCase() : "--"}
            />
            {edicion ? null : (
              <Lectura rotulo="Estado inicial" regla="RN-03" valor={inicial ? ETIQUETA_ESTADO[inicial].toUpperCase() : "--"} />
            )}
          </dl>
          <p className="mt-4 text-sm text-placa-tenue">
            {!prioridad || !categoria
              ? "Completá tipo de pedido, impacto y urgencia para ver el resultado."
              : edicion
                ? "Si cambia la prioridad, el vencimiento se recalcula desde que empezó a correr el plazo."
                : categoria.requiereAprobacion
                ? "El plazo empieza a correr cuando un aprobador la autorice."
                : "El plazo corre desde que la registrás."}
          </p>
        </div>
      </aside>
    </form>
  );
}

function Lectura({ rotulo, regla, valor }: { rotulo: string; regla: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <dt className="flex justify-between text-xs text-placa-tenue">
        <span>{rotulo}</span>
        <span>{regla}</span>
      </dt>
      <dd className="text-2xl font-bold leading-tight text-ambar-placa">
        <Paletas texto={valor} />
      </dd>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  errores,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  errores?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {etiqueta}
      </label>
      {children}
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-sm text-tinta-2">
          {ayuda}
        </p>
      ) : null}
      <p id={`${id}-error`} className="text-sm font-bold text-vencida empty:hidden">
        {errores?.[0]}
      </p>
    </div>
  );
}

function Escala({
  nombre,
  leyenda,
  opciones,
  valor,
  onChange,
  errores,
}: {
  nombre: string;
  leyenda: string;
  opciones: { valor: Nivel; titulo: string; ayuda: string }[];
  valor: Nivel | "";
  onChange: (v: Nivel) => void;
  errores?: string[];
}) {
  return (
    <fieldset aria-describedby={`${nombre}-error`}>
      <legend className="mb-1.5 font-bold">{leyenda}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {opciones.map((o) => (
          <label
            key={o.valor}
            className="flex cursor-pointer flex-col rounded border border-regla bg-papel px-3 py-2.5 hover:border-tinta-2 has-checked:border-noche has-checked:bg-resaltado has-focus-visible:outline-2 has-focus-visible:outline-noche"
          >
            <span className="flex items-center gap-2 font-bold">
              <input
                type="radio"
                name={nombre}
                value={o.valor}
                checked={valor === o.valor}
                onChange={() => onChange(o.valor)}
                className="accent-noche"
                required
              />
              {o.titulo}
            </span>
            <span className="pl-6 text-sm text-tinta-2">{o.ayuda}</span>
          </label>
        ))}
      </div>
      <p id={`${nombre}-error`} className="mt-1.5 text-sm font-bold text-vencida empty:hidden">
        {errores?.[0]}
      </p>
    </fieldset>
  );
}
