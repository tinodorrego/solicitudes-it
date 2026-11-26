"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", etiqueta: "Tablero", activo: (p: string) => p === "/" || (p.startsWith("/solicitudes/") && p !== "/solicitudes/nueva") },
  { href: "/indicadores", etiqueta: "Indicadores", activo: (p: string) => p.startsWith("/indicadores") },
];

export function Navegacion({ estatica }: { estatica?: boolean }) {
  return estatica ? <Enlaces ruta="" /> : <NavegacionActiva />;
}

function NavegacionActiva() {
  return <Enlaces ruta={usePathname()} />;
}

function Enlaces({ ruta }: { ruta: string }) {
  return (
    <nav aria-label="Principal" className="flex gap-1">
      {ENLACES.map((e) => {
        const activo = e.activo(ruta);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? "page" : undefined}
            className={`rounded px-3 py-1.5 text-sm no-underline transition-colors focus-visible:outline-placa ${
              activo ? "bg-noche-2 font-bold text-placa" : "text-placa-tenue hover:text-placa"
            }`}
          >
            {e.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
