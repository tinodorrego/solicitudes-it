# 06 · Matriz de trazabilidad

Recorre la cadena objetivo → requisito → historia → test → código. Cada test cita en su nombre el ID que verifica, así que esta matriz se puede comprobar buscando el ID en el repositorio.

| Objetivo | Requisito | Regla | Historia | Test | Código | Estado |
|---|---|---|---|---|---|---|
| OBJ-01 | RF-01 | — | HU-01 | `dominio.test.ts › RF-01` · `solicitudes.test.ts › RF-01 a RF-04` | `domain/solicitud.ts › nuevaSolicitudSchema` · `services/solicitudes.ts › crearSolicitud` · `app/solicitudes/nueva/` | ✅ |
| OBJ-02 | RF-02 | RN-01 | HU-02 | `dominio.test.ts › RF-02 / RN-01` | `domain/solicitud.ts › calcularPrioridad` | ✅ |
| OBJ-03 | RF-03 | RN-02 | HU-02 | `dominio.test.ts › RF-03 / RN-02` · `solicitudes.test.ts › RF-01 a RF-04` | `domain/solicitud.ts › calcularVencimiento` | ✅ |
| OBJ-04 | RF-04 | RN-03 | HU-02, HU-03 | `dominio.test.ts › RF-04 / RN-03` · `solicitudes.test.ts › queda PENDIENTE_APROBACION…` | `domain/solicitud.ts › estadoInicial` · `services/solicitudes.ts` | ✅ |
| OBJ-01, OBJ-03 | RF-05 | — | HU-04 | `solicitudes.test.ts › RF-05` | `services/solicitudes.ts › listarSolicitudes` · `app/page.tsx` | ✅ |
| OBJ-05 | RF-06 | — | HU-05 | `solicitudes.test.ts › RF-06` | `services/solicitudes.ts › crearSolicitud` (transacción) | 🟡 solo el alta |
| OBJ-04 | RF-07 | RN-03, RN-04 | HU-03 | — | — | ⬜ pendiente |
| OBJ-01 | RF-08 | RN-04 | — | — | — | ⬜ pendiente |
| OBJ-04, OBJ-05 | RF-09 | RN-04 | HU-06 | `dominio.test.ts › RF-09 / RN-04` | `domain/solicitud.ts › puedeTransicionar` | 🟡 sin interfaz |
| OBJ-03 | RF-10 | RN-05 | HU-04 | `dominio.test.ts › RF-10 / RN-05` | `domain/solicitud.ts › evaluarSla` · `app/page.tsx › Semaforo` | ✅ |
| — | RNF-01 | — | HU-01 | `dominio.test.ts › RF-01` | `app/solicitudes/nueva/actions.ts` | ✅ |
| — | RNF-03 | — | — | — | — | ⬜ pendiente |
| — | RNF-04 | — | — | CI | `.github/workflows/ci.yml` | ✅ |
| — | RNF-05 | — | — | — | `db/schema.ts` · `lib/formato.ts` | ✅ |

**Cobertura v0.1:** 6 de 10 requisitos funcionales implementados por completo, 2 parciales y 2 pendientes. Todos los requisitos implementados tienen al menos un test que cita su ID.

En el roadmap está automatizar esta matriz: una herramienta que lea los IDs de `docs/` y de `tests/` y falle en CI si queda un requisito sin test.
