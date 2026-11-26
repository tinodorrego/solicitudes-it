# 03 · Especificación de requisitos (SRS)

Estructura basada en ISO/IEC/IEEE 29148, reducida a lo que este proyecto necesita. Versión 0.2.

## 1. Propósito

Especificar el sistema que centraliza las solicitudes internas a IT, les asigna prioridad y plazo con reglas explícitas y deja registro de su ciclo de vida.

## 2. Definiciones

| Término | Definición |
|---|---|
| Solicitud | Pedido de un empleado a IT. Se identifica como `SOL-0001`. |
| Impacto | A cuántas personas o procesos afecta el problema: Alto, Medio, Bajo. |
| Urgencia | Cuánto puede esperar: Alta, Media, Baja. |
| Prioridad | Resultado de combinar impacto y urgencia: Crítica, Alta, Media, Baja. |
| SLA | Plazo comprometido de resolución, contado en horas desde que empieza a correr. |
| Vencimiento | Momento en que se cumple el SLA. |

## 3. Reglas de negocio

**RN-01. Matriz de prioridad.**

| Impacto \ Urgencia | Alta | Media | Baja |
|---|---|---|---|
| **Alto** | Crítica | Alta | Media |
| **Medio** | Alta | Media | Baja |
| **Bajo** | Media | Baja | Baja |

**RN-02. Plazo por prioridad** (horas corridas en v0.1; el horario hábil queda pendiente): Crítica 4 h, Alta 8 h, Media 24 h, Baja 72 h.

**RN-03. Aprobación previa.** Las categorías Acceso a sistemas, Hardware e Instalación de software requieren aprobación. La solicitud nace en `PENDIENTE_APROBACION` y el SLA no corre hasta que se apruebe. En el resto de las categorías nace en `NUEVA` y el SLA corre desde el alta.

**RN-04. Transiciones permitidas.** Solo se admiten las del diagrama de estados de [02 · Procesos](02-procesos.md#ciclo-de-vida-de-una-solicitud-rn-04). `CERRADA`, `RECHAZADA` y `CANCELADA` son estados finales.

**RN-05. Semáforo de SLA.** *En término* si queda al menos el 25 % del plazo, *En riesgo* si queda menos del 25 %, *Vencida* al alcanzar el vencimiento. Las resueltas o cerradas se evalúan contra el momento de su última resolución: *Cumplida* si fue antes del vencimiento, *Fuera de término* si no. Las que no tienen SLA corriendo se muestran como *Sin SLA*.

**RN-06. Permisos por rol.**

| Acción | Desde | Hacia | Quién | Texto |
|---|---|---|---|---|
| Aprobar | Pendiente de aprobación | Nueva | Aprobador | opcional |
| Rechazar | Pendiente de aprobación | Rechazada | Aprobador | motivo obligatorio |
| Asignar | Nueva | Asignada | Agente (a sí mismo o a otro agente) | opcional |
| Empezar a trabajar | Asignada | En progreso | Agente asignado | opcional |
| Resolver | En progreso | Resuelta | Agente asignado | nota de resolución obligatoria |
| Confirmar y cerrar | Resuelta | Cerrada | Quien la pidió | opcional |
| Reabrir | Resuelta | En progreso | Quien la pidió | motivo obligatorio |
| Cancelar | Pendiente, Nueva o Asignada | Cancelada | Quien la pidió | motivo obligatorio |

Editar (RF-11) lo puede hacer solo quien la pidió, mientras esté Pendiente de aprobación o Nueva. Comentar (RF-12) lo puede hacer cualquiera mientras la solicitud no esté terminada.

## 4. Requisitos funcionales

| ID | Requisito | Reglas | Prioridad | Estado v0.1 |
|---|---|---|---|---|
| RF-01 | El sistema debe permitir registrar una solicitud con título (5 a 120 caracteres), detalle (10 a 2000), categoría, solicitante, impacto y urgencia. | — | Must | Implementado |
| RF-02 | El sistema debe calcular la prioridad a partir del impacto y la urgencia. | RN-01 | Must | Implementado |
| RF-03 | El sistema debe calcular el vencimiento a partir de la prioridad y el inicio del SLA. | RN-02 | Must | Implementado |
| RF-04 | El sistema debe asignar el estado inicial según la categoría. | RN-03 | Must | Implementado |
| RF-05 | El sistema debe listar las solicitudes ordenadas por vencimiento (las que no tienen SLA al final) y permitir filtrarlas por estado. | — | Must | Implementado |
| RF-06 | El sistema debe registrar cada cambio de estado con estado anterior, nuevo, usuario, motivo y momento. | — | Must | Implementado |
| RF-07 | El aprobador debe poder aprobar o rechazar solicitudes pendientes; el rechazo exige motivo. Al aprobar empieza a correr el SLA. | RN-03, RN-04, RN-06 | Must | Implementado |
| RF-08 | El agente debe poder asignarse o asignar una solicitud a otro agente. | RN-04, RN-06 | Must | Implementado |
| RF-09 | El sistema debe ofrecer a cada usuario solo las acciones que puede ejecutar y rechazar en el servidor cualquier transición inválida. | RN-04, RN-06 | Must | Implementado |
| RF-10 | El sistema debe mostrar el semáforo de SLA de cada solicitud, incluido si se resolvió a tiempo. | RN-05 | Must | Implementado |
| RF-11 | Quien pidió la solicitud debe poder editar título, detalle, impacto y urgencia antes de que la tomen. La prioridad y el vencimiento se recalculan sin mover el inicio del plazo, y el cambio queda registrado. | RN-01, RN-02, RN-06 | Should | Implementado |
| RF-12 | Los participantes deben poder dejar comentarios de seguimiento, que se muestran junto con los cambios de estado en una única línea de tiempo. | RN-06 | Must | Implementado |
| RF-13 | El sistema debe mostrar indicadores de gestión: abiertas, vencidas, en riesgo, pendientes de aprobación, cumplimiento de SLA, tiempo medio de resolución, abiertas por prioridad, carga por agente, creadas y resueltas por día y solicitudes por tipo. | RN-05 | Should | Implementado |

## 5. Requisitos no funcionales

| ID | Requisito | Verificación | Estado v0.1 |
|---|---|---|---|
| RNF-01 | Toda entrada se valida en el servidor, aunque el navegador ya la valide. | Test de validación + Server Action | Implementado |
| RNF-02 | La interfaz está en español rioplatense y se puede usar con teclado: campos etiquetados, errores asociados al campo y foco visible. | Revisión manual | Implementado |
| RNF-03 | El acceso requiere autenticación y cada rol ve solo sus acciones. | Tests de permisos (RN-06) | Parcial: roles y permisos implementados en el servidor; el usuario se elige con un selector ("Actuando como") en lugar de iniciar sesión |
| RNF-04 | Cada cambio pasa lint, verificación de tipos, tests y build en CI antes de integrarse. | GitHub Actions | Implementado |
| RNF-05 | Las fechas se guardan con zona horaria (`timestamptz`) y se muestran en hora de Argentina. | Esquema + formato | Implementado |

## 6. Supuestos y restricciones

- No hay inicio de sesión: un selector "Actuando como" simula al usuario actual. Los permisos se validan igual en el servidor, así que sumar un login real solo reemplaza `src/lib/actor.ts`.
- El SLA usa horas corridas; el calendario hábil y los feriados quedan para una versión futura.
- Stack: Next.js, TypeScript y PostgreSQL. Las decisiones están en [`decisiones/`](decisiones/).

Siguiente: [04 · Historias de usuario](04-historias.md).
