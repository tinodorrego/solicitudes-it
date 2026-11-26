# 06 · Matriz de trazabilidad

Recorre la cadena objetivo → requisito → historia → test → código. Cada test cita en su nombre el ID que verifica, así que esta matriz se puede comprobar buscando el ID en el repositorio.

| Objetivo | Requisito | Regla | Historia | Test | Código | Estado |
|---|---|---|---|---|---|---|
| OBJ-01 | RF-01 | — | HU-01 | `dominio.test.ts › RF-01` · `solicitudes.test.ts › RF-01 a RF-04` | `domain/solicitud.ts › nuevaSolicitudSchema` · `services/solicitudes.ts › crearSolicitud` · `app/solicitudes/nueva/` | ✅ |
| OBJ-02 | RF-02 | RN-01 | HU-02 | `dominio.test.ts › RF-02 / RN-01` | `domain/solicitud.ts › calcularPrioridad` | ✅ |
| OBJ-03 | RF-03 | RN-02 | HU-02 | `dominio.test.ts › RF-03 / RN-02` · `solicitudes.test.ts › RF-01 a RF-04` | `domain/solicitud.ts › calcularVencimiento` | ✅ |
| OBJ-04 | RF-04 | RN-03 | HU-02, HU-03 | `dominio.test.ts › RF-04 / RN-03` · `solicitudes.test.ts › queda PENDIENTE_APROBACION…` | `domain/solicitud.ts › estadoInicial` | ✅ |
| OBJ-01, OBJ-03 | RF-05 | — | HU-04 | `solicitudes.test.ts › RF-05` · `ciclo.test.ts › RF-05 — orden del tablero` · `ciclo.test.ts › RF-05 — filtros por persona` | `services/solicitudes.ts › listarSolicitudes` · `app/page.tsx` | ✅ |
| OBJ-05 | RF-06 | — | HU-05 | `solicitudes.test.ts › RF-06` · `ciclo.test.ts › recorre asignar → … → cerrar` | `services/solicitudes.ts › ejecutarAccion, obtenerSeguimiento` | ✅ |
| OBJ-04 | RF-07 | RN-03, RN-04, RN-06 | HU-03 | `ciclo.test.ts › RF-07` | `domain/acciones.ts` · `services/solicitudes.ts › ejecutarAccion` · `app/solicitudes/[id]/` | ✅ |
| OBJ-01 | RF-08 | RN-04, RN-06 | HU-06 | `ciclo.test.ts › RF-08 / RF-09` | `domain/acciones.ts › puedeEjecutar` · `app/solicitudes/[id]/panel-acciones.tsx` | ✅ |
| OBJ-04, OBJ-05 | RF-09 | RN-04, RN-06 | HU-06 | `dominio.test.ts › RF-09 / RN-04` · `ciclo.test.ts › ofrece a cada actor solo sus acciones` | `domain/acciones.ts › accionesDisponibles` | ✅ |
| OBJ-03 | RF-10 | RN-05 | HU-04 | `dominio.test.ts › RF-10 / RN-05` · `ciclo.test.ts › RF-10 / RN-05` | `domain/solicitud.ts › evaluarSla` · `components/semaforo.tsx` | ✅ |
| OBJ-02 | RF-11 | RN-01, RN-02, RN-06 | HU-07 | `ciclo.test.ts › RF-11` | `domain/acciones.ts › puedeEditar` · `services/solicitudes.ts › editarSolicitud` · `app/solicitudes/[id]/editar/` | ✅ |
| OBJ-01, OBJ-05 | RF-12 | RN-06 | HU-05, HU-08 | `ciclo.test.ts › RF-12` | `services/solicitudes.ts › comentar` · `app/solicitudes/[id]/form-comentario.tsx` | ✅ |
| OBJ-03 | RF-13 | RN-05 | HU-09 | `ciclo.test.ts › RF-13` | `services/indicadores.ts` · `app/indicadores/` · `components/graficos.tsx` | ✅ |
| — | RNF-01 | — | HU-01 | `dominio.test.ts › RF-01` | Server Actions en `app/**/acciones.ts` y `actions.ts` | ✅ |
| — | RNF-03 | RN-06 | HU-06 | `ciclo.test.ts › RN-06…` | `lib/actor.ts` (usuario simulado) | 🟡 sin login real |
| — | RNF-04 | — | — | CI | `.github/workflows/ci.yml` | ✅ |
| — | RNF-05 | — | — | — | `db/schema.ts` · `lib/formato.ts` | ✅ |

**Cobertura v0.2:** los 13 requisitos funcionales están implementados y cada uno tiene al menos un test que cita su ID. RNF-03 queda parcial: los permisos por rol se validan en el servidor, pero el usuario se elige con un selector en lugar de iniciar sesión.

En el roadmap está automatizar esta matriz: una herramienta que lea los IDs de `docs/` y de `tests/` y falle en CI si queda un requisito sin test.
