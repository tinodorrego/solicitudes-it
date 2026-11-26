/**
 * Gráficos en HTML/CSS puro, sin librería. Especificación: barras de hasta 24px con
 * punta redondeada de 4px y base recta, 2px de separación entre segmentos, leyenda
 * siempre visible con 2+ series, texto en tinta (nunca en el color de la serie)
 * y tabla de datos equivalente. Colores validados con el validador de paletas.
 */

/** Series categóricas (identidad). Validadas sobre #fbfbf8: ΔE CVD 26.5. */
export const SERIE = { a: "#2f62b5", b: "#c27c0e" } as const;
/** Estados de SLA (reservados): siempre con leyenda y etiqueta. */
export const ESTADO = { termino: "#24704a", riesgo: "#c98a12", vencida: "#b3261e" } as const;

export type Segmento = { valor: number; color: string; nombre: string };

export function Leyenda({ items }: { items: { color: string; nombre: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
      {items.map((i) => (
        <li key={i.nombre} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

/** Barras horizontales (apiladas si hay más de un segmento). El total va en la punta. */
export function BarrasHorizontales({
  filas,
  maximo,
  unidad = "",
}: {
  filas: { etiqueta: string; detalle?: string; segmentos: Segmento[] }[];
  maximo?: number;
  unidad?: string;
}) {
  const tope = Math.max(1, maximo ?? Math.max(...filas.map((f) => f.segmentos.reduce((a, s) => a + s.valor, 0))));
  return (
    <div className="flex flex-col gap-3">
      {filas.map((f) => {
        const total = f.segmentos.reduce((a, s) => a + s.valor, 0);
        const visibles = f.segmentos.filter((s) => s.valor > 0);
        const descripcion = `${f.etiqueta}: ${total}${unidad}${
          f.segmentos.length > 1 ? ` (${f.segmentos.map((s) => `${s.nombre} ${s.valor}`).join(", ")})` : ""
        }`;
        return (
          <div key={f.etiqueta} className="grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3">
            <div className="text-sm leading-tight">
              {f.etiqueta}
              {f.detalle ? <span className="block text-xs text-tinta-2">{f.detalle}</span> : null}
            </div>
            <div className="flex items-center gap-2" role="img" aria-label={descripcion}>
              <div className="flex h-5 gap-[2px]" style={{ width: `${(total / tope) * 85}%` }}>
                {visibles.map((s, i) => (
                  <div
                    key={s.nombre}
                    title={`${f.etiqueta} · ${s.nombre}: ${s.valor}${unidad}`}
                    className={i === visibles.length - 1 ? "rounded-r" : ""}
                    style={{ flexGrow: s.valor, flexBasis: 0, background: s.color, minWidth: 3 }}
                  />
                ))}
              </div>
              <span className="text-sm font-bold">
                {total}
                {unidad}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Columnas agrupadas sobre un eje con marcas redondas. */
export function ColumnasAgrupadas({
  grupos,
  series,
}: {
  grupos: { etiqueta: string; valores: number[] }[];
  series: { nombre: string; color: string }[];
}) {
  const max = Math.max(1, ...grupos.flatMap((g) => g.valores));
  const paso = max <= 4 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
  const tope = Math.ceil(max / paso) * paso;
  const marcas = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso).reverse();
  const alto = 160;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between pb-6 text-right text-xs text-tinta-2 tabular-nums" style={{ height: alto + 24 }}>
        {marcas.map((m) => (
          <span key={m} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {m}
          </span>
        ))}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: alto }} aria-hidden="true">
          {marcas.map((m) => (
            <div key={m} className="border-t border-regla" />
          ))}
        </div>
        <div className="relative flex items-end justify-around" style={{ height: alto }}>
          {grupos.map((g) => (
            <div
              key={g.etiqueta}
              className="flex h-full items-end gap-[2px]"
              role="img"
              aria-label={`${g.etiqueta}: ${series.map((s, i) => `${s.nombre} ${g.valores[i]}`).join(", ")}`}
            >
              {g.valores.map((v, i) => (
                <div
                  key={series[i].nombre}
                  title={`${g.etiqueta} · ${series[i].nombre}: ${v}`}
                  className="w-3 rounded-t sm:w-5"
                  style={{ height: v ? `${(v / tope) * 100}%` : 0, background: series[i].color }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-around text-xs text-tinta-2">
          {grupos.map((g) => (
            <span key={g.etiqueta}>{g.etiqueta}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Vista de tabla: el equivalente accesible de cada gráfico. */
export function TablaDatos({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-tinta-2 hover:text-tinta">Ver los datos en una tabla</summary>
      <table className="mt-2 w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-b border-regla text-left text-xs text-tinta-2">
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={`py-1.5 pr-3 font-bold ${i > 0 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={String(f[0])} className="border-b border-regla last:border-b-0">
              {f.map((v, i) => (
                <td key={i} className={`py-1.5 pr-3 ${i > 0 ? "text-right" : ""}`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
