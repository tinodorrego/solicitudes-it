import { describe, expect, it } from "vitest";
import {
  calcularPrioridad,
  calcularVencimiento,
  estadoInicial,
  evaluarSla,
  formatearCodigo,
  nuevaSolicitudSchema,
  puedeTransicionar,
} from "@/domain/solicitud";

const h = (horas: number) => horas * 60 * 60 * 1000;

describe("RF-02 / RN-01 — prioridad por impacto × urgencia", () => {
  it.each([
    ["ALTO", "ALTO", "CRITICA"],
    ["ALTO", "MEDIO", "ALTA"],
    ["ALTO", "BAJO", "MEDIA"],
    ["MEDIO", "ALTO", "ALTA"],
    ["MEDIO", "MEDIO", "MEDIA"],
    ["MEDIO", "BAJO", "BAJA"],
    ["BAJO", "ALTO", "MEDIA"],
    ["BAJO", "MEDIO", "BAJA"],
    ["BAJO", "BAJO", "BAJA"],
  ] as const)("impacto %s + urgencia %s → %s", (impacto, urgencia, esperada) => {
    expect(calcularPrioridad(impacto, urgencia)).toBe(esperada);
  });
});

describe("RF-03 / RN-02 — vencimiento por prioridad", () => {
  const inicio = new Date("2026-03-02T12:00:00Z");
  it.each([
    ["CRITICA", 4],
    ["ALTA", 8],
    ["MEDIA", 24],
    ["BAJA", 72],
  ] as const)("%s vence a las %i horas", (prioridad, horas) => {
    expect(calcularVencimiento(prioridad, inicio).getTime() - inicio.getTime()).toBe(h(horas));
  });
});

describe("RF-04 / RN-03 — estado inicial", () => {
  it("categoría con aprobación → PENDIENTE_APROBACION", () => {
    expect(estadoInicial(true)).toBe("PENDIENTE_APROBACION");
  });
  it("categoría sin aprobación → NUEVA", () => {
    expect(estadoInicial(false)).toBe("NUEVA");
  });
});

describe("RF-09 / RN-04 — transiciones del ciclo de vida", () => {
  it("permite el camino feliz completo", () => {
    expect(puedeTransicionar("NUEVA", "ASIGNADA")).toBe(true);
    expect(puedeTransicionar("ASIGNADA", "EN_PROGRESO")).toBe(true);
    expect(puedeTransicionar("EN_PROGRESO", "RESUELTA")).toBe(true);
    expect(puedeTransicionar("RESUELTA", "CERRADA")).toBe(true);
  });
  it("permite reabrir una solicitud resuelta", () => {
    expect(puedeTransicionar("RESUELTA", "EN_PROGRESO")).toBe(true);
  });
  it("no permite saltear la aprobación ni salir de estados finales", () => {
    expect(puedeTransicionar("PENDIENTE_APROBACION", "ASIGNADA")).toBe(false);
    expect(puedeTransicionar("CERRADA", "EN_PROGRESO")).toBe(false);
    expect(puedeTransicionar("RECHAZADA", "NUEVA")).toBe(false);
  });
});

describe("RF-10 / RN-05 — semáforo de SLA", () => {
  const inicioSla = new Date("2026-03-02T12:00:00Z");
  const vencimiento = new Date(inicioSla.getTime() + h(8));
  const en = (horas: number) => new Date(inicioSla.getTime() + h(horas));

  it("en término con más del 25 % del plazo por delante", () => {
    expect(evaluarSla({ estado: "NUEVA", inicioSla, vencimiento, ahora: en(5) })).toBe("EN_TERMINO");
  });
  it("en riesgo con menos del 25 % del plazo restante", () => {
    expect(evaluarSla({ estado: "EN_PROGRESO", inicioSla, vencimiento, ahora: en(6.5) })).toBe("EN_RIESGO");
  });
  it("vencida al llegar al vencimiento", () => {
    expect(evaluarSla({ estado: "ASIGNADA", inicioSla, vencimiento, ahora: en(8) })).toBe("VENCIDA");
  });
  it("sin SLA mientras espera aprobación", () => {
    expect(
      evaluarSla({ estado: "PENDIENTE_APROBACION", inicioSla: null, vencimiento: null, ahora: en(1) }),
    ).toBe("SIN_SLA");
  });
  it("cumplida una vez resuelta, aunque haya pasado el plazo", () => {
    expect(evaluarSla({ estado: "RESUELTA", inicioSla, vencimiento, ahora: en(20) })).toBe("CUMPLIDA");
  });
});

describe("RF-01 — validación del alta", () => {
  const valida = {
    titulo: "No puedo ingresar a la VPN",
    descripcion: "Desde esta mañana la VPN rechaza mi usuario.",
    categoriaId: "1",
    solicitanteId: "1",
    impacto: "ALTO",
    urgencia: "MEDIO",
  };

  it("acepta una solicitud completa", () => {
    expect(nuevaSolicitudSchema.safeParse(valida).success).toBe(true);
  });
  it("rechaza títulos cortos y descripciones vacías con mensajes en español", () => {
    const r = nuevaSolicitudSchema.safeParse({ ...valida, titulo: "VPN", descripcion: "  " });
    expect(r.success).toBe(false);
    const campos = r.error!.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["titulo", "descripcion"]));
  });
  it("rechaza niveles fuera de la escala", () => {
    expect(nuevaSolicitudSchema.safeParse({ ...valida, impacto: "ENORME" }).success).toBe(false);
  });
  it("formatea el código legible", () => {
    expect(formatearCodigo(7)).toBe("SOL-0007");
  });
});
