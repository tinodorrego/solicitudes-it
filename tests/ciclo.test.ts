import { beforeEach, describe, expect, it } from "vitest";
import { crearDbEnMemoria, type Db } from "@/db/client";
import {
  comentar,
  crearSolicitud,
  editarSolicitud,
  ejecutarAccion,
  listarCatalogos,
  listarSolicitudes,
  listarUsuarios,
  obtenerSeguimiento,
} from "@/services/solicitudes";
import { obtenerIndicadores } from "@/services/indicadores";
import { accionesDisponibles, puedeEditar, type Actor } from "@/domain/acciones";
import { evaluarSla } from "@/domain/solicitud";

const H = 60 * 60 * 1000;
const t0 = new Date("2026-03-02T12:00:00Z");
const en = (horas: number) => new Date(t0.getTime() + horas * H);

let db: Db;
let ana: Actor, bruno: Actor, carla: Actor, martin: Actor, diego: Actor;
let cat: { incidente: number; acceso: number };

beforeEach(async () => {
  db = await crearDbEnMemoria();
  const usuarios = await listarUsuarios(db);
  const u = (nombre: string): Actor => {
    const x = usuarios.find((y) => y.nombre === nombre)!;
    return { id: x.id, rol: x.rol };
  };
  [ana, bruno, carla, martin, diego] = ["Ana Torres", "Bruno Paz", "Carla Ríos", "Martín Gil", "Diego Sosa"].map(u);
  const { categorias } = await listarCatalogos(db);
  cat = {
    incidente: categorias.find((c) => c.nombre === "Incidente")!.id,
    acceso: categorias.find((c) => c.nombre === "Acceso a sistemas")!.id,
  };
});

const nueva = (categoriaId = cat.incidente, solicitante = ana) =>
  crearSolicitud(
    db,
    {
      titulo: "No funciona la VPN",
      descripcion: "La VPN rechaza mi usuario desde hoy.",
      categoriaId,
      solicitanteId: solicitante.id,
      impacto: "MEDIO",
      urgencia: "ALTO",
    },
    t0,
  );

describe("RF-07 — aprobación y rechazo", () => {
  it("al aprobar pasa a NUEVA y el SLA empieza a correr desde la aprobación", async () => {
    const s = await nueva(cat.acceso);
    const aprobada = await ejecutarAccion(db, { solicitudId: s.id, accion: "APROBAR", actor: diego }, en(3));
    expect(aprobada.estado).toBe("NUEVA");
    expect(aprobada.inicioSla?.toISOString()).toBe(en(3).toISOString());
    expect(aprobada.venceEn?.toISOString()).toBe(en(3 + 8).toISOString());
  });

  it("rechazar exige motivo y queda registrado", async () => {
    const s = await nueva(cat.acceso);
    await expect(ejecutarAccion(db, { solicitudId: s.id, accion: "RECHAZAR", actor: diego }, en(1))).rejects.toThrow("motivo");
    await ejecutarAccion(db, { solicitudId: s.id, accion: "RECHAZAR", actor: diego, motivo: "Falta autorización del jefe de área" }, en(1));
    const seg = await obtenerSeguimiento(db, s.id);
    expect(seg.at(-1)).toMatchObject({ tipo: "ESTADO", hacia: "RECHAZADA", motivo: "Falta autorización del jefe de área" });
  });

  it("RN-06: un agente no puede aprobar", async () => {
    const s = await nueva(cat.acceso);
    await expect(ejecutarAccion(db, { solicitudId: s.id, accion: "APROBAR", actor: carla }, en(1))).rejects.toThrow("aprobador");
  });
});

describe("RF-08 / RF-09 — asignación y ciclo de trabajo", () => {
  it("recorre asignar → iniciar → resolver → cerrar con historial completo", async () => {
    const s = await nueva();
    await ejecutarAccion(db, { solicitudId: s.id, accion: "ASIGNAR", actor: carla, asignadoId: martin.id }, en(1));
    await ejecutarAccion(db, { solicitudId: s.id, accion: "INICIAR", actor: martin }, en(2));
    const resuelta = await ejecutarAccion(db, { solicitudId: s.id, accion: "RESOLVER", actor: martin, motivo: "Se reseteó la contraseña" }, en(5));
    expect(resuelta.resueltaEn?.toISOString()).toBe(en(5).toISOString());
    await ejecutarAccion(db, { solicitudId: s.id, accion: "CERRAR", actor: ana }, en(6));

    const estados = (await obtenerSeguimiento(db, s.id)).filter((e) => e.tipo === "ESTADO").map((e) => e.tipo === "ESTADO" && e.hacia);
    expect(estados).toEqual(["NUEVA", "ASIGNADA", "EN_PROGRESO", "RESUELTA", "CERRADA"]);
  });

  it("solo el agente asignado puede iniciar o resolver", async () => {
    const s = await nueva();
    await ejecutarAccion(db, { solicitudId: s.id, accion: "ASIGNAR", actor: carla }, en(1));
    await expect(ejecutarAccion(db, { solicitudId: s.id, accion: "INICIAR", actor: martin }, en(2))).rejects.toThrow("asignado");
  });

  it("no se puede asignar a alguien que no es agente", async () => {
    const s = await nueva();
    await expect(
      ejecutarAccion(db, { solicitudId: s.id, accion: "ASIGNAR", actor: carla, asignadoId: bruno.id }, en(1)),
    ).rejects.toThrow("agente");
  });

  it("reabrir exige motivo, vuelve a EN_PROGRESO y limpia la resolución", async () => {
    const s = await nueva();
    await ejecutarAccion(db, { solicitudId: s.id, accion: "ASIGNAR", actor: carla }, en(1));
    await ejecutarAccion(db, { solicitudId: s.id, accion: "INICIAR", actor: carla }, en(1));
    await ejecutarAccion(db, { solicitudId: s.id, accion: "RESOLVER", actor: carla, motivo: "Listo" }, en(2));
    const reabierta = await ejecutarAccion(db, { solicitudId: s.id, accion: "REABRIR", actor: ana, motivo: "Volvió a fallar" }, en(3));
    expect(reabierta.estado).toBe("EN_PROGRESO");
    expect(reabierta.resueltaEn).toBeNull();
  });

  it("un tercero no puede cancelar el pedido de otra persona", async () => {
    const s = await nueva();
    await expect(ejecutarAccion(db, { solicitudId: s.id, accion: "CANCELAR", actor: bruno, motivo: "x" }, en(1))).rejects.toThrow("pidió");
  });

  it("ofrece a cada actor solo sus acciones", async () => {
    const s = await nueva();
    expect(accionesDisponibles(s, ana)).toEqual(["CANCELAR"]);
    expect(accionesDisponibles(s, carla)).toEqual(["ASIGNAR"]);
    expect(accionesDisponibles(s, diego)).toEqual([]);
  });
});

describe("RF-10 / RN-05 — SLA de solicitudes resueltas", () => {
  it("cumplida si se resolvió antes del vencimiento, fuera de término si no", () => {
    const base = { estado: "RESUELTA" as const, inicioSla: t0, vencimiento: en(8), ahora: en(30) };
    expect(evaluarSla({ ...base, resueltaEn: en(7) })).toBe("CUMPLIDA");
    expect(evaluarSla({ ...base, resueltaEn: en(9) })).toBe("INCUMPLIDA");
  });
});

describe("RF-11 — edición", () => {
  it("recalcula prioridad y vencimiento manteniendo el inicio del SLA, y deja registro", async () => {
    const s = await nueva();
    const editada = await editarSolicitud(
      db,
      { solicitudId: s.id, actor: ana, datos: { titulo: s.titulo, descripcion: s.descripcion, impacto: "ALTO", urgencia: "ALTO" } },
      en(1),
    );
    expect(editada.prioridad).toBe("CRITICA");
    expect(editada.venceEn?.toISOString()).toBe(en(4).toISOString());
    const seg = await obtenerSeguimiento(db, s.id);
    expect(seg.at(-1)).toMatchObject({ tipo: "EDICION", texto: "Editó impacto Medio → Alto." });
  });

  it("no permite editar una vez asignada ni a otra persona", async () => {
    const s = await nueva();
    expect(puedeEditar(s, bruno).ok).toBe(false);
    const asignada = await ejecutarAccion(db, { solicitudId: s.id, accion: "ASIGNAR", actor: carla }, en(1));
    expect(puedeEditar(asignada, ana).ok).toBe(false);
  });
});

describe("RF-12 — comentarios", () => {
  it("se agregan a la línea de tiempo en orden", async () => {
    const s = await nueva();
    await comentar(db, { solicitudId: s.id, actor: carla, texto: "¿Desde qué red te conectás?" }, en(1));
    await comentar(db, { solicitudId: s.id, actor: ana, texto: "Desde el wifi de casa." }, en(2));
    const textos = (await obtenerSeguimiento(db, s.id)).flatMap((e) => (e.tipo === "COMENTARIO" ? [e.texto] : []));
    expect(textos).toEqual(["¿Desde qué red te conectás?", "Desde el wifi de casa."]);
  });

  it("no se puede comentar una solicitud cerrada", async () => {
    const s = await nueva();
    await ejecutarAccion(db, { solicitudId: s.id, accion: "CANCELAR", actor: ana, motivo: "Ya se solucionó solo" }, en(1));
    await expect(comentar(db, { solicitudId: s.id, actor: ana, texto: "Hola" }, en(2))).rejects.toThrow("cerrada");
  });
});

describe("RF-05 — orden del tablero", () => {
  it("muestra primero las abiertas por vencimiento, después resueltas y al final las terminadas", async () => {
    const cerrada = await nueva();
    await ejecutarAccion(db, { solicitudId: cerrada.id, accion: "CANCELAR", actor: ana, motivo: "Ya no hace falta" }, en(1));
    const abierta = await nueva();
    const ids = (await listarSolicitudes(db)).map((s) => s.id);
    expect(ids).toEqual([abierta.id, cerrada.id]);
  });
});

describe("RF-05 — filtros por persona", () => {
  it("filtra por solicitante y por agente asignado", async () => {
    const a = await nueva(cat.incidente, ana);
    const b = await nueva(cat.incidente, bruno);
    await ejecutarAccion(db, { solicitudId: b.id, accion: "ASIGNAR", actor: carla }, en(1));
    expect((await listarSolicitudes(db, { solicitanteId: ana.id })).map((s) => s.id)).toEqual([a.id]);
    expect((await listarSolicitudes(db, { asignadoId: carla.id })).map((s) => s.id)).toEqual([b.id]);
  });
});

describe("RF-13 — indicadores", () => {
  it("cuenta abiertas, vencidas y cumplimiento de SLA con las mismas reglas del tablero", async () => {
    const aTiempo = await nueva();
    const tarde = await nueva();
    await nueva(); // queda abierta y vencida
    await nueva(cat.acceso); // pendiente de aprobación

    for (const [s, horas] of [[aTiempo, 5], [tarde, 10]] as const) {
      await ejecutarAccion(db, { solicitudId: s.id, accion: "ASIGNAR", actor: carla }, en(1));
      await ejecutarAccion(db, { solicitudId: s.id, accion: "INICIAR", actor: carla }, en(1));
      await ejecutarAccion(db, { solicitudId: s.id, accion: "RESOLVER", actor: carla, motivo: "Hecho" }, en(horas));
    }

    const ind = await obtenerIndicadores(db, en(12));
    expect(ind.abiertas).toBe(2);
    expect(ind.pendientesAprobacion).toBe(1);
    expect(ind.vencidas).toBe(1);
    expect(ind.resueltas).toBe(2);
    expect(ind.cumplimientoSla).toBe(0.5);
    expect(ind.horasPromedioResolucion).toBe(7.5);
    // La vencida y la pendiente de aprobación son ambas de prioridad Alta.
    expect(ind.abiertasPorPrioridad.ALTA).toEqual({ total: 2, vencidas: 1, enRiesgo: 0 });
  });
});
