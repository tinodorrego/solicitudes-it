# 04 · Historias de usuario

Formato INVEST. Los criterios de aceptación están en Gherkin (español) y cada uno indica qué test lo verifica.

---

## HU-01 · Registrar un pedido sin saber de sistemas

**Como** empleado de cualquier área, **quiero** contar qué necesito en un formulario simple **para** no depender de a qué agente le escribo.

Cubre: RF-01, RNF-01, RNF-02 · Estado: **Hecha**

```gherkin
Escenario: Alta completa
  Dado que completo título, detalle, tipo de pedido, quién lo pide, impacto y urgencia
  Cuando registro la solicitud
  Entonces se guarda con un código SOL-xxxx
  Y vuelvo al tablero con la solicitud resaltada

Escenario: Datos incompletos
  Dado que dejo el título con menos de 5 caracteres
  Cuando registro la solicitud
  Entonces veo "El título debe tener al menos 5 caracteres." junto al campo
  Y no se guarda nada
```

Verificación: `tests/dominio.test.ts › RF-01`, `tests/solicitudes.test.ts › RF-01 a RF-04`, prueba manual en el navegador.

---

## HU-02 · Saber qué prioridad y plazo tendrá mi pedido antes de enviarlo

**Como** solicitante, **quiero** ver la prioridad y el plazo que el sistema va a asignar mientras completo el formulario **para** entender por qué mi pedido se atiende en ese orden.

Cubre: RF-02, RF-03, RF-04 · Estado: **Hecha**

```gherkin
Escenario: Prioridad calculada en vivo
  Dado que elegí impacto "Medio" y urgencia "Alta"
  Entonces el panel muestra prioridad "ALTA" citando RN-01
  Y "Se resuelve en 8 H" citando RN-02

Esquema del escenario: Matriz de prioridad
  Dado impacto <impacto> y urgencia <urgencia>
  Entonces la prioridad es <prioridad>
  Ejemplos:
    | impacto | urgencia | prioridad |
    | Alto    | Alta     | Crítica   |
    | Medio   | Media    | Media     |
    | Bajo    | Baja     | Baja      |
```

Verificación: `tests/dominio.test.ts › RF-02 / RN-01` (las 9 combinaciones), `› RF-03 / RN-02`.

---

## HU-03 · Pedidos sensibles pasan por aprobación

**Como** aprobador de Gerencia IT, **quiero** que los pedidos de acceso, hardware y software esperen mi autorización **para** que nada sensible se ejecute sin registro.

Cubre: RF-04, RF-07 · Estado: **Hecha**

```gherkin
Escenario: Nace pendiente y sin reloj
  Dado que registro una solicitud de "Acceso a sistemas"
  Entonces queda en "Pendiente de aprobación"
  Y no tiene vencimiento hasta que se apruebe

Escenario: Aprobación
  Dado una solicitud pendiente de aprobación
  Cuando el aprobador la aprueba
  Entonces pasa a "Nueva" y el SLA empieza a correr desde ese momento

Escenario: Rechazo con motivo
  Cuando el aprobador la rechaza sin escribir motivo
  Entonces el sistema pide "Indicá el motivo." y no la rechaza

Escenario: Solo aprueba un aprobador (RN-06)
  Dado que actúo como agente
  Entonces no veo la acción "Aprobar" y el servidor la rechaza si la intento
```

Verificación: `tests/solicitudes.test.ts › queda PENDIENTE_APROBACION…`, `tests/ciclo.test.ts › RF-07`.

---

## HU-04 · Ver qué vence primero

**Como** agente de mesa de ayuda, **quiero** un tablero ordenado por vencimiento, con un semáforo de SLA, **para** atender primero lo que está por vencer.

Cubre: RF-05, RF-10 · Estado: **Hecha**

```gherkin
Escenario: Orden por vencimiento
  Dado solicitudes con vencimientos distintos y una sin SLA
  Cuando abro el tablero
  Entonces aparecen de la más próxima a vencer a la más lejana
  Y las que no tienen SLA quedan al final

Escenario: Semáforo
  Dado una solicitud a la que le queda menos del 25 % del plazo
  Entonces se muestra "En riesgo"

Escenario: Filtro por estado
  Cuando elijo el filtro "Nueva"
  Entonces solo veo solicitudes en estado Nueva
```

Verificación: `tests/solicitudes.test.ts › RF-05`, `tests/dominio.test.ts › RF-10 / RN-05`.

---

## HU-05 · Que quede registro de cada cambio

**Como** responsable de IT, **quiero** el historial de estados de cada solicitud **para** auditar qué pasó y cuándo.

Cubre: RF-06, RF-12 · Estado: **Hecha**

```gherkin
Escenario: Historial del alta
  Cuando se registra una solicitud
  Entonces el historial tiene un evento sin estado anterior y con el estado inicial

Escenario: Línea de tiempo completa
  Dado una solicitud que pasó por asignar, empezar, resolver y cerrar
  Entonces el seguimiento muestra cada paso con quién, cuándo y el motivo o nota
```

Verificación: `tests/solicitudes.test.ts › RF-06`, `tests/ciclo.test.ts › recorre asignar → iniciar → resolver → cerrar…`.

---

## HU-06 · Respetar el ciclo de vida

**Como** responsable de IT, **quiero** que el sistema no permita saltearse pasos (por ejemplo, ejecutar algo sin aprobar) **para** que el proceso sea confiable.

Cubre: RF-08, RF-09 · Estado: **Hecha**

```gherkin
Escenario: Transición inválida
  Dado una solicitud "Pendiente de aprobación"
  Cuando se intenta pasar a "Asignada"
  Entonces el sistema lo rechaza

Escenario: Cada uno ve sus acciones
  Dado una solicitud "Nueva"
  Entonces quien la pidió ve "Cancelar pedido", un agente ve "Asignar" y un aprobador no ve acciones

Escenario: Solo el agente asignado la trabaja
  Dado una solicitud asignada a Carla
  Cuando Martín intenta empezarla
  Entonces el sistema responde "Solo el agente asignado puede hacerlo."
```

Verificación: `tests/dominio.test.ts › RF-09 / RN-04`, `tests/ciclo.test.ts › RF-08 / RF-09`.

---

## HU-07 · Corregir mi pedido antes de que lo tomen

**Como** solicitante, **quiero** corregir el pedido si me equivoqué en el impacto o la urgencia **para** que se atienda con la prioridad correcta.

Cubre: RF-11 · Estado: **Hecha**

```gherkin
Escenario: Edición que cambia la prioridad
  Dado mi solicitud "Nueva" con impacto Medio y urgencia Alta, creada hace 1 hora
  Cuando cambio el impacto a Alto
  Entonces la prioridad pasa a Crítica, vence 4 horas después de su creación
  Y el seguimiento muestra "Editó impacto Medio → Alto."

Escenario: Ya la tomaron
  Dado mi solicitud "Asignada"
  Entonces no puedo editarla
```

Verificación: `tests/ciclo.test.ts › RF-11`.

---

## HU-08 · Conversar sobre el pedido sin salir del sistema

**Como** solicitante o agente, **quiero** dejar comentarios en la solicitud **para** no volver al mail o al chat (P-01).

Cubre: RF-12 · Estado: **Hecha**

```gherkin
Escenario: Comentario
  Cuando escribo un comentario
  Entonces aparece en el seguimiento con mi nombre y la hora

Escenario: Solicitud terminada
  Dado una solicitud cancelada
  Entonces ya no admite comentarios
```

Verificación: `tests/ciclo.test.ts › RF-12`.

---

## HU-09 · Ver cómo viene la mesa de ayuda

**Como** responsable de IT, **quiero** un tablero de indicadores **para** saber si cumplimos los plazos y dónde está la carga.

Cubre: RF-13 · Estado: **Hecha**

```gherkin
Escenario: Cumplimiento de SLA
  Dado 2 solicitudes resueltas, una dentro del plazo y otra fuera
  Entonces el cumplimiento de SLA es 50 %

Escenario: Mismas reglas que el tablero
  Dado una solicitud abierta y vencida
  Entonces cuenta como vencida en el indicador y en su prioridad
```

Verificación: `tests/ciclo.test.ts › RF-13`.

Siguiente: [05 · Modelo de datos](05-modelo-datos.md).
