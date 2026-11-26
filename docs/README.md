# Documentación

Se lee en orden: cada documento se apoya en el anterior y todos los requisitos tienen ID para rastrearlos hasta el código.

| # | Documento | Qué contiene |
|---|---|---|
| 01 | [Relevamiento](01-relevamiento.md) | Contexto, partes interesadas, problemas (P-xx), objetivos (OBJ-xx) y alcance |
| 02 | [Procesos](02-procesos.md) | BPMN AS-IS y TO-BE, diagrama de estados |
| 03 | [SRS](03-srs.md) | Reglas de negocio (RN-xx), requisitos funcionales (RF-xx) y no funcionales (RNF-xx) |
| 04 | [Historias de usuario](04-historias.md) | HU-xx con criterios de aceptación en Gherkin |
| 05 | [Modelo de datos](05-modelo-datos.md) | DER y diccionario de datos |
| 06 | [Trazabilidad](06-trazabilidad.md) | Objetivo → requisito → historia → test → código |
| — | [Decisiones](decisiones/) | ADRs de arquitectura |

**Convención:** los tests llevan el ID del requisito en su nombre (`describe("RF-02 / RN-01 — …")`) y el código cita la regla que implementa en un comentario. Buscar un ID en el repo muestra toda su cadena.
