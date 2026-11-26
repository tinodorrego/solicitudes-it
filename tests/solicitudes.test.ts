import { beforeEach, describe, expect, it } from "vitest";
import { crearDbEnMemoria, type Db } from "@/db/client";
import { crearSolicitud, listarCatalogos, listarSolicitudes, obtenerHistorial } from "@/services/solicitudes";
import type { NuevaSolicitud } from "@/domain/solicitud";

let db: Db;
let ids: { incidente: number; acceso: number; solicitante: number };

beforeEach(async () => {
  db = await crearDbEnMemoria();
  const { categorias, solicitantes } = await listarCatalogos(db);
  ids = {
    incidente: categorias.find((c) => c.nombre === "Incidente")!.id,
    acceso: categorias.find((c) => c.nombre === "Acceso a sistemas")!.id,
    solicitante: solicitantes[0].id,
  };
});

const base = (extra: Partial<NuevaSolicitud> = {}): NuevaSolicitud => ({
  titulo: "La impresora del piso 3 no imprime",
  descripcion: "Queda la cola trabada desde las 9.",
  categoriaId: ids.incidente,
  solicitanteId: ids.solicitante,
  impacto: "MEDIO",
  urgencia: "ALTO",
  ...extra,
});

const ahora = new Date("2026-03-02T12:00:00Z");

describe("RF-01 a RF-04 — alta de solicitud", () => {
  it("guarda prioridad calculada, estado NUEVA y vencimiento cuando no requiere aprobación", async () => {
    const s = await crearSolicitud(db, base(), ahora);
    expect(s.prioridad).toBe("ALTA");
    expect(s.estado).toBe("NUEVA");
    expect(s.inicioSla?.toISOString()).toBe(ahora.toISOString());
    expect(s.venceEn?.toISOString()).toBe("2026-03-02T20:00:00.000Z");
  });

  it("queda PENDIENTE_APROBACION y sin reloj de SLA si la categoría requiere aprobación", async () => {
    const s = await crearSolicitud(db, base({ categoriaId: ids.acceso }), ahora);
    expect(s.estado).toBe("PENDIENTE_APROBACION");
    expect(s.inicioSla).toBeNull();
    expect(s.venceEn).toBeNull();
  });

  it("rechaza una categoría inexistente", async () => {
    await expect(crearSolicitud(db, base({ categoriaId: 999 }), ahora)).rejects.toThrow("categoría");
  });
});

describe("RF-06 — historial de estados", () => {
  it("registra el estado inicial al crear", async () => {
    const s = await crearSolicitud(db, base(), ahora);
    const historial = await obtenerHistorial(db, s.id);
    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({ estadoAnterior: null, estadoNuevo: "NUEVA" });
  });
});

describe("RF-05 — listado", () => {
  it("ordena por vencimiento, deja al final las que no tienen SLA y filtra por estado", async () => {
    const baja = await crearSolicitud(db, base({ titulo: "Pedido de mouse nuevo", impacto: "BAJO", urgencia: "BAJO" }), ahora);
    const critica = await crearSolicitud(db, base({ titulo: "Se cayó el sistema de ventas", impacto: "ALTO", urgencia: "ALTO" }), ahora);
    const pendiente = await crearSolicitud(db, base({ titulo: "Acceso al ERP de compras", categoriaId: ids.acceso }), ahora);

    const todas = await listarSolicitudes(db);
    expect(todas.map((s) => s.id)).toEqual([critica.id, baja.id, pendiente.id]);

    const nuevas = await listarSolicitudes(db, { estado: "NUEVA" });
    expect(nuevas.map((s) => s.id)).toEqual([critica.id, baja.id]);
  });
});
