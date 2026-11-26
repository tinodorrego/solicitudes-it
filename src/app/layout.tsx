import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Overpass } from "next/font/google";
import { obtenerActorActual } from "@/lib/actor";
import { SelectorActor } from "@/components/selector-actor";
import { Navegacion } from "@/components/navegacion";
import "./globals.css";

const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Solicitudes IT", template: "%s · Solicitudes IT" },
  description: "Gestión de solicitudes internas a IT con prioridad calculada y seguimiento de SLA.",
};

async function Actor() {
  await connection();
  const { actor, usuarios } = await obtenerActorActual();
  return (
    <SelectorActor
      key={actor.id}
      actualId={actor.id}
      usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre, rol: u.rol }))}
    />
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${overpass.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="bg-noche text-placa">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
            <Link href="/" className="flex flex-col no-underline">
              <span className="text-lg font-bold tracking-[-0.01em]">Solicitudes IT</span>
              <span className="text-xs text-placa-tenue">Mesa de ayuda · demo con datos ficticios</span>
            </Link>
            <Suspense fallback={<Navegacion estatica />}>
              <Navegacion />
            </Suspense>
            <div className="ml-auto flex flex-wrap items-center gap-4">
              <Suspense fallback={<span className="text-xs text-placa-tenue">Cargando usuario…</span>}>
                <Actor />
              </Suspense>
              <Link
                href="/solicitudes/nueva"
                className="shrink-0 whitespace-nowrap rounded bg-placa px-4 py-2 text-sm font-bold text-noche no-underline transition-colors hover:bg-white focus-visible:outline-placa"
              >
                Nueva solicitud
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-regla">
          <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-tinta-2">
            v0.2 · Sin inicio de sesión: elegí arriba con qué usuario ficticio actuar. Cada regla visible está numerada en{" "}
            <code>docs/03-srs.md</code>.
          </p>
        </footer>
      </body>
    </html>
  );
}
