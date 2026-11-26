# ADR-001 · Stack de la aplicación

**Estado:** aceptada · **Fecha:** 2026-11-25

## Contexto

Es una aplicación interna con formularios, un tablero y reglas de negocio que tienen que poder probarse sin la interfaz. Va a crecer hacia roles, aprobaciones y reportes.

## Decisión

- **Next.js (App Router) + TypeScript.** Server Components para leer datos sin una API intermedia y Server Actions para las mutaciones, con validación en el servidor (RNF-01).
- **PostgreSQL + Drizzle ORM.** Esquema tipado en TypeScript, migraciones SQL legibles y versionadas, y enums nativos para los dominios cerrados.
- **Zod** para validar la entrada. El mismo esquema sirve en el servidor y en los tests.
- **Capa de dominio pura** (`src/domain/`): las reglas RN-xx son funciones sin dependencias de framework ni de base de datos, así que se prueban en milisegundos.
- **Vitest** para tests de dominio y de integración contra una base real (ver ADR-002).

## Consecuencias

- Las reglas se pueden reutilizar en el cliente (el panel que calcula en vivo usa las mismas funciones que el servidor).
- Cambiar de framework web no toca el dominio.
- Next.js 16 con Cache Components obliga a declarar explícitamente qué partes leen datos por request (`<Suspense>` + `connection()`).
