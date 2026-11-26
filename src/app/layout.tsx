import type { Metadata } from "next";
import Link from "next/link";
import { Overpass } from "next/font/google";
import "./globals.css";

const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Solicitudes IT", template: "%s · Solicitudes IT" },
  description: "Gestión de solicitudes internas a IT con prioridad calculada y seguimiento de SLA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${overpass.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="bg-noche text-placa">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
            <Link href="/" className="group flex flex-col no-underline">
              <span className="text-lg font-bold tracking-[-0.01em]">Solicitudes IT</span>
              <span className="text-xs text-placa-tenue">Mesa de ayuda · demo con datos ficticios</span>
            </Link>
            <Link
              href="/solicitudes/nueva"
              className="shrink-0 whitespace-nowrap rounded bg-placa px-4 py-2 text-sm font-bold text-noche transition-colors hover:bg-white focus-visible:outline-placa"
            >
              Nueva solicitud
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-regla">
          <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-tinta-2">
            v0.1 · Cada regla visible en pantalla está numerada en <code>docs/03-srs.md</code>.
          </p>
        </footer>
      </body>
    </html>
  );
}
