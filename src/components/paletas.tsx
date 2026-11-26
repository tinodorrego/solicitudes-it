"use client";

/**
 * Texto de tablero: cada carácter es una "paleta" que gira cuando su valor cambia.
 * La key por posición + carácter hace que solo se remonten (y animen) los que cambiaron.
 */
export function Paletas({ texto, className }: { texto: string; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{texto}</span>
      {Array.from(texto).map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          aria-hidden="true"
          className="paleta"
          style={{ "--i": i } as React.CSSProperties}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
