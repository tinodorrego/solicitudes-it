# 02 · Procesos (AS-IS / TO-BE)

Los diagramas siguen la notación BPMN de forma simplificada: carriles por rol, eventos de inicio y fin, tareas y compuertas. Están escritos en Mermaid para que se versionen junto con el código.

## AS-IS: cómo se pide hoy

```mermaid
flowchart LR
  subgraph S[Solicitante]
    A((Inicio)) --> B[Escribe mail o chat al agente que conoce]
    B --> C{¿Respondieron?}
    C -- No --> D[Reclama por otro canal]
    D --> B
  end
  subgraph AG[Agente]
    E[Lee el pedido cuando puede] --> F{¿Es urgente según quién lo pide?}
    F -- Sí --> G[Lo resuelve]
    F -- No --> H[Lo anota en su lista personal]
    H --> G
  end
  B --> E
  G --> I((Fin))
  C -- Sí --> I
```

Puntos de dolor: P-01 (canales múltiples), P-02 (prioridad subjetiva en la compuerta F), P-03 (sin plazo), P-05 (sin registro).

## TO-BE: con solicitudes-it

```mermaid
flowchart LR
  subgraph S[Solicitante]
    A((Inicio)) --> B[Registra la solicitud: qué, impacto, urgencia]
  end
  subgraph SIS[Sistema]
    B --> C[Calcula prioridad · RN-01]
    C --> D{¿La categoría requiere aprobación? · RN-03}
    D -- No --> E[Estado NUEVA · arranca el SLA · RN-02]
    D -- Sí --> F[Estado PENDIENTE_APROBACION · SLA detenido]
  end
  subgraph AP[Aprobador]
    F --> G{¿Aprueba?}
  end
  G -- Sí --> E
  G -- No --> R((Rechazada))
  subgraph AG[Agente]
    E --> H[Toma la solicitud del tablero, ordenado por vencimiento]
    H --> I[Trabaja y resuelve con nota de resolución]
  end
  subgraph CI[Solicitante]
    I --> K{¿Quedó resuelto?}
  end
  K -- Sí --> J((Cerrada))
  K -- No, reabre con motivo --> H
```

Desde v0.2 están implementados todos los carriles: registro, aprobación (RF-07), asignación y trabajo del agente (RF-08, RF-09), con los permisos de RN-06.

## Ciclo de vida de una solicitud (RN-04)

```mermaid
stateDiagram-v2
  [*] --> PENDIENTE_APROBACION: categoría con aprobación
  [*] --> NUEVA: categoría sin aprobación
  PENDIENTE_APROBACION --> NUEVA: aprobar
  PENDIENTE_APROBACION --> RECHAZADA: rechazar (con motivo)
  PENDIENTE_APROBACION --> CANCELADA
  NUEVA --> ASIGNADA
  NUEVA --> CANCELADA
  ASIGNADA --> EN_PROGRESO
  ASIGNADA --> CANCELADA
  EN_PROGRESO --> RESUELTA
  RESUELTA --> CERRADA
  RESUELTA --> EN_PROGRESO: reabrir
  CERRADA --> [*]
  RECHAZADA --> [*]
  CANCELADA --> [*]
```

La tabla `TRANSICIONES` de [`src/domain/solicitud.ts`](../src/domain/solicitud.ts) es la fuente única de este diagrama y está cubierta por tests.

Siguiente: [03 · SRS](03-srs.md).
