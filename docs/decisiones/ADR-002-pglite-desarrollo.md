# ADR-002 · PostgreSQL embebido (PGlite) para desarrollo y tests

**Estado:** aceptada · **Fecha:** 2026-11-25

## Contexto

Clonar el repo y probarlo no debería exigir instalar PostgreSQL ni Docker. Los tests de integración necesitan una base real: un mock no detecta errores de SQL, de restricciones ni de enums.

## Decisión

- Si existe `DATABASE_URL`, la aplicación usa PostgreSQL real con `node-postgres`.
- Si no existe, usa **PGlite**, que es PostgreSQL compilado a WebAssembly. Los datos quedan en `./.pglite`.
- Los tests crean una base **en memoria** por caso, le aplican las mismas migraciones de `drizzle/` y la cargan con los datos semilla.

## Consecuencias

- `npm install && npm run dev` alcanza para tener la aplicación andando.
- Los tests corren contra el mismo motor y las mismas migraciones que producción.
- PGlite es de un solo proceso: no sirve para producción con varias instancias. Para eso está `DATABASE_URL`.
- Como en cualquier PostgreSQL, las secuencias pueden saltar números después de un reinicio. Los códigos `SOL-xxxx` son únicos, pero no necesariamente correlativos.
