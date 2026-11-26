/**
 * Carga una semana de solicitudes ficticias recorriendo todo el ciclo de vida, con fechas
 * relativas a "ahora", para que el tablero, el seguimiento y los indicadores tengan datos.
 *   npm run db:demo            carga solo si la base está vacía
 *   npm run db:demo -- --reset borra las solicitudes y vuelve a cargar
 */
import { sql } from "drizzle-orm";
import { obtenerDb, type Db } from "@/db/client";
import { solicitudes } from "@/db/schema";
import { comentar, crearSolicitud, ejecutarAccion, listarCatalogos, listarUsuarios } from "@/services/solicitudes";
import type { Accion, Actor } from "@/domain/acciones";
import type { Nivel } from "@/domain/solicitud";

const ahora = Date.now();
const hace = (horas: number) => new Date(ahora - horas * 60 * 60 * 1000);

type Paso =
  | { h: number; accion: Accion; por: string; motivo?: string; a?: string }
  | { h: number; comentario: string; por: string };

type Caso = {
  titulo: string;
  descripcion: string;
  categoria: string;
  por: string;
  impacto: Nivel;
  urgencia: Nivel;
  h: number;
  pasos?: Paso[];
};

const CASOS: Caso[] = [
  {
    titulo: "Se cayó el sistema de facturación",
    descripcion: "Nadie del área puede emitir facturas desde las 9. Aparece un error de conexión al abrir el módulo.",
    categoria: "Incidente", por: "Ana Torres", impacto: "ALTO", urgencia: "ALTO", h: 3.5,
    pasos: [
      { h: 3.3, accion: "ASIGNAR", por: "Carla Ríos" },
      { h: 3.1, accion: "INICIAR", por: "Carla Ríos" },
      { h: 2.9, comentario: "Estoy revisando el servidor de base de datos; el servicio se reinició solo a las 8:55.", por: "Carla Ríos" },
      { h: 2.5, comentario: "Gracias. ¿Hay alguna forma de emitir las urgentes a mano mientras tanto?", por: "Ana Torres" },
    ],
  },
  {
    titulo: "La impresora del piso 3 no imprime",
    descripcion: "Los trabajos quedan en cola y no salen. Ya la apagamos y prendimos.",
    categoria: "Incidente", por: "Bruno Paz", impacto: "MEDIO", urgencia: "ALTO", h: 9,
  },
  {
    titulo: "Cómo comparto un calendario con mi equipo",
    descripcion: "Quiero que mi equipo vea mi agenda de visitas a clientes sin poder editarla.",
    categoria: "Consulta", por: "Bruno Paz", impacto: "BAJO", urgencia: "BAJO", h: 2,
  },
  {
    titulo: "Monitor con líneas verticales",
    descripcion: "El monitor secundario muestra líneas verticales de colores desde ayer.",
    categoria: "Incidente", por: "Ana Torres", impacto: "BAJO", urgencia: "MEDIO", h: 30,
    pasos: [{ h: 28, accion: "ASIGNAR", por: "Martín Gil" }],
  },
  {
    titulo: "Acceso al módulo de compras del ERP",
    descripcion: "Me sumo al equipo de compras y necesito cargar órdenes de compra.",
    categoria: "Acceso a sistemas", por: "Ana Torres", impacto: "MEDIO", urgencia: "MEDIO", h: 0.5,
  },
  {
    titulo: "Notebook nueva para ingreso de vendedor",
    descripcion: "Entra un vendedor nuevo el lunes y necesita notebook con el software comercial.",
    categoria: "Hardware", por: "Bruno Paz", impacto: "BAJO", urgencia: "ALTO", h: 50,
    pasos: [
      { h: 48, accion: "APROBAR", por: "Diego Sosa" },
      { h: 47, accion: "ASIGNAR", por: "Martín Gil" },
      { h: 40, accion: "INICIAR", por: "Martín Gil" },
      { h: 39, comentario: "Hay una en depósito; falta instalar el software comercial y probar la VPN.", por: "Martín Gil" },
    ],
  },
  {
    titulo: "Licencia de editor de diagramas",
    descripcion: "Necesito una licencia para armar los diagramas del proceso de cobranzas.",
    categoria: "Instalación de software", por: "Ana Torres", impacto: "BAJO", urgencia: "BAJO", h: 20,
    pasos: [{ h: 18, accion: "RECHAZAR", por: "Diego Sosa", motivo: "Ya hay una herramienta de diagramas aprobada; Carla te pasa el acceso." }],
  },
  {
    titulo: "No puedo entrar a la VPN desde casa",
    descripcion: "La VPN rechaza mi usuario desde esta mañana. Ya reinicié la notebook.",
    categoria: "Incidente", por: "Ana Torres", impacto: "MEDIO", urgencia: "ALTO", h: 120,
    pasos: [
      { h: 119.5, accion: "ASIGNAR", por: "Carla Ríos" },
      { h: 119, accion: "INICIAR", por: "Carla Ríos" },
      { h: 116, accion: "RESOLVER", por: "Carla Ríos", motivo: "La contraseña había vencido. Se reseteó y se probó la conexión." },
      { h: 115, accion: "CERRAR", por: "Ana Torres" },
    ],
  },
  {
    titulo: "El correo no sincroniza en el celular",
    descripcion: "Desde el cambio de contraseña el correo no baja en el celular.",
    categoria: "Incidente", por: "Bruno Paz", impacto: "ALTO", urgencia: "MEDIO", h: 96,
    pasos: [
      { h: 95, accion: "ASIGNAR", por: "Martín Gil" },
      { h: 90, accion: "INICIAR", por: "Martín Gil" },
      { h: 85, accion: "RESOLVER", por: "Martín Gil", motivo: "Se volvió a configurar la cuenta en el celular." },
      { h: 84, accion: "CERRAR", por: "Bruno Paz" },
    ],
  },
  {
    titulo: "Usuario bloqueado en el sistema de pedidos",
    descripcion: "Me bloqueó el usuario después de tres intentos.",
    categoria: "Incidente", por: "Bruno Paz", impacto: "BAJO", urgencia: "ALTO", h: 72,
    pasos: [
      { h: 71.5, accion: "ASIGNAR", por: "Carla Ríos" },
      { h: 71.4, accion: "INICIAR", por: "Carla Ríos" },
      { h: 70, accion: "RESOLVER", por: "Carla Ríos", motivo: "Se desbloqueó el usuario. Te llegó un mail para elegir contraseña nueva." },
    ],
  },
  {
    titulo: "Wifi inestable en la sala de reuniones",
    descripcion: "Se corta cada pocos minutos durante las videollamadas.",
    categoria: "Incidente", por: "Ana Torres", impacto: "MEDIO", urgencia: "MEDIO", h: 144,
    pasos: [
      { h: 140, accion: "ASIGNAR", por: "Martín Gil" },
      { h: 125, accion: "INICIAR", por: "Martín Gil" },
      { h: 114, accion: "RESOLVER", por: "Martín Gil", motivo: "Se cambió el canal del access point y se actualizó el firmware." },
      { h: 100, accion: "REABRIR", por: "Ana Torres", motivo: "Hoy volvió a cortarse en la reunión de las 10." },
      { h: 98, accion: "RESOLVER", por: "Martín Gil", motivo: "Se reemplazó el access point." },
      { h: 97, accion: "CERRAR", por: "Ana Torres" },
    ],
  },
  {
    titulo: "Instalar Power BI Desktop",
    descripcion: "Lo necesito para armar el tablero de ventas mensual.",
    categoria: "Instalación de software", por: "Bruno Paz", impacto: "MEDIO", urgencia: "BAJO", h: 48,
    pasos: [
      { h: 46, accion: "APROBAR", por: "Diego Sosa" },
      { h: 45, accion: "ASIGNAR", por: "Carla Ríos" },
      { h: 44, accion: "INICIAR", por: "Carla Ríos" },
      { h: 26, accion: "RESOLVER", por: "Carla Ríos", motivo: "Instalado y con licencia asignada." },
    ],
  },
  {
    titulo: "Mouse nuevo",
    descripcion: "El mouse hace doble clic solo.",
    categoria: "Hardware", por: "Ana Torres", impacto: "BAJO", urgencia: "BAJO", h: 26,
    pasos: [{ h: 24, accion: "CANCELAR", por: "Ana Torres", motivo: "Conseguí uno de repuesto en el área." }],
  },
  {
    titulo: "Teclado con teclas que no responden",
    descripcion: "No funcionan la Ñ ni la tecla de borrar.",
    categoria: "Incidente", por: "Bruno Paz", impacto: "BAJO", urgencia: "BAJO", h: 150,
    pasos: [
      { h: 140, accion: "ASIGNAR", por: "Carla Ríos" },
      { h: 110, accion: "INICIAR", por: "Carla Ríos" },
      { h: 100, accion: "RESOLVER", por: "Carla Ríos", motivo: "Se reemplazó el teclado." },
      { h: 99, accion: "CERRAR", por: "Bruno Paz" },
    ],
  },
];

async function cargar(db: Db) {
  const [{ categorias }, usuarios] = await Promise.all([listarCatalogos(db), listarUsuarios(db)]);
  const quien = (nombre: string): Actor => {
    const u = usuarios.find((x) => x.nombre === nombre);
    if (!u) throw new Error(`Usuario semilla inexistente: ${nombre}`);
    return { id: u.id, rol: u.rol };
  };
  const cat = (nombre: string) => categorias.find((c) => c.nombre === nombre)!.id;

  for (const c of [...CASOS].sort((a, b) => b.h - a.h)) {
    const s = await crearSolicitud(
      db,
      { titulo: c.titulo, descripcion: c.descripcion, categoriaId: cat(c.categoria), solicitanteId: quien(c.por).id, impacto: c.impacto, urgencia: c.urgencia },
      hace(c.h),
    );
    for (const p of c.pasos ?? []) {
      if ("comentario" in p) await comentar(db, { solicitudId: s.id, actor: quien(p.por), texto: p.comentario }, hace(p.h));
      else
        await ejecutarAccion(
          db,
          { solicitudId: s.id, accion: p.accion, actor: quien(p.por), motivo: p.motivo, asignadoId: p.a ? quien(p.a).id : undefined },
          hace(p.h),
        );
    }
  }
}

async function main() {
  const db = await obtenerDb();
  if (process.argv.includes("--reset")) {
    await db.execute(sql`truncate table comentarios, historial_estados, solicitudes restart identity`);
  } else if ((await db.select({ id: solicitudes.id }).from(solicitudes).limit(1)).length > 0) {
    console.log("La base ya tiene solicitudes. Usá `npm run db:demo -- --reset` para reemplazarlas.");
    return;
  }
  await cargar(db);
  console.log(`Cargadas ${CASOS.length} solicitudes de demostración.`);
}

main().then(() => process.exit(0));
