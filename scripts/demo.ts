/**
 * Carga solicitudes ficticias con fechas relativas a "ahora" para que el tablero
 * muestre todos los estados del semáforo de SLA. Uso: npm run db:demo
 */
import { obtenerDb } from "@/db/client";
import { solicitudes } from "@/db/schema";
import { crearSolicitud, listarCatalogos } from "@/services/solicitudes";
import type { Nivel } from "@/domain/solicitud";

const horas = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

async function main() {
  const db = await obtenerDb();
  const existentes = await db.select({ id: solicitudes.id }).from(solicitudes).limit(1);
  if (existentes.length > 0) {
    console.log("La base ya tiene solicitudes; no se cargó nada.");
    return;
  }

  const { categorias, solicitantes } = await listarCatalogos(db);
  const cat = (nombre: string) => categorias.find((c) => c.nombre === nombre)!.id;
  const [ana, bruno] = solicitantes;

  const casos: { titulo: string; descripcion: string; categoria: string; quien: number; impacto: Nivel; urgencia: Nivel; haceHoras: number }[] = [
    { titulo: "Se cayó el sistema de facturación", descripcion: "Nadie del área puede emitir facturas desde las 9.", categoria: "Incidente", quien: ana.id, impacto: "ALTO", urgencia: "ALTO", haceHoras: 3.5 },
    { titulo: "La impresora del piso 3 no imprime", descripcion: "Los trabajos quedan en cola y no salen.", categoria: "Incidente", quien: bruno.id, impacto: "MEDIO", urgencia: "ALTO", haceHoras: 9 },
    { titulo: "Cómo comparto un calendario con mi equipo", descripcion: "Quiero que mi equipo vea mi agenda de visitas.", categoria: "Consulta", quien: bruno.id, impacto: "BAJO", urgencia: "BAJO", haceHoras: 2 },
    { titulo: "Monitor con líneas verticales", descripcion: "El monitor secundario muestra líneas desde ayer.", categoria: "Incidente", quien: ana.id, impacto: "BAJO", urgencia: "MEDIO", haceHoras: 1 },
    { titulo: "Acceso al módulo de compras del ERP", descripcion: "Me sumo al equipo de compras y necesito cargar órdenes.", categoria: "Acceso a sistemas", quien: ana.id, impacto: "MEDIO", urgencia: "MEDIO", haceHoras: 0.5 },
  ];

  for (const c of casos) {
    await crearSolicitud(
      db,
      { titulo: c.titulo, descripcion: c.descripcion, categoriaId: cat(c.categoria), solicitanteId: c.quien, impacto: c.impacto, urgencia: c.urgencia },
      horas(c.haceHoras),
    );
  }
  console.log(`Cargadas ${casos.length} solicitudes de demostración.`);
}

main().then(() => process.exit(0));
