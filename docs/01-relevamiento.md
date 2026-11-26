# 01 · Relevamiento

> Caso de estudio con una organización **ficticia** ("la Organización"): unas 250 personas, 6 áreas y una mesa de ayuda de 3 agentes. Las personas y los datos de este documento son inventados.

## Contexto

Los pedidos a IT llegan por cuatro canales: mail a una casilla compartida, chat directo a los agentes, llamados y pasillo. No hay un registro único: cada agente lleva su propia lista.

## Partes interesadas

| Rol | Interés principal | Participación |
|---|---|---|
| Solicitante (cualquier empleado) | Pedir sin conocer jerga técnica y saber cuándo se resuelve | Entrevistas (4 personas de Finanzas y Comercial) |
| Agente de mesa de ayuda | Una sola cola, ordenada por lo que vence primero | Entrevista + observación de una jornada |
| Aprobador (Gerencia IT) | Autorizar accesos y compras antes de que se ejecuten | Entrevista |
| Gerencia de áreas | Visibilidad del cumplimiento de plazos | Revisión del alcance |

## Problemas detectados

| ID | Problema | Evidencia del relevamiento | Consecuencia |
|---|---|---|---|
| P-01 | Pedidos dispersos en varios canales | Los 3 agentes llevan listas distintas | Pedidos olvidados o duplicados |
| P-02 | La prioridad la decide quien grita más fuerte | Sin criterio escrito; "lo urgente es lo del jefe" | Incidentes críticos esperan detrás de consultas |
| P-03 | Nadie sabe cuándo vence un pedido | No existe compromiso de plazo | Reclamos y seguimiento manual por chat |
| P-04 | Accesos otorgados sin autorización registrada | Accesos dados "por mail" | Riesgo de auditoría |
| P-05 | No hay historia de qué pasó con un pedido | Sin registro de cambios | Imposible medir tiempos |

## Objetivos

| ID | Objetivo | Problemas que ataca | Cómo se mide |
|---|---|---|---|
| OBJ-01 | Canal único de registro | P-01 | 100 % de los pedidos con código SOL-xxxx |
| OBJ-02 | Priorización objetiva | P-02 | Prioridad calculada por regla, no elegida a mano |
| OBJ-03 | Plazo comprometido y visible | P-03 | Cada pedido con SLA muestra su vencimiento y su semáforo |
| OBJ-04 | Aprobación previa en categorías sensibles | P-04 | Ningún acceso pasa a la cola sin aprobación |
| OBJ-05 | Trazabilidad de cambios de estado | P-05 | Historial completo por solicitud |

## Alcance

**Dentro de v0.1:** alta de solicitudes, prioridad calculada, vencimiento de SLA, estado inicial según la categoría, tablero ordenado por vencimiento con filtro y semáforo, historial del alta.

**Próximas versiones:** aprobación y rechazo, asignación a agentes, cambios de estado desde la interfaz, autenticación por roles, horario hábil para el SLA y reportes de cumplimiento.

**Fuera de alcance:** inventario de activos, base de conocimiento, integración con mail.

Siguiente: [02 · Procesos](02-procesos.md).
