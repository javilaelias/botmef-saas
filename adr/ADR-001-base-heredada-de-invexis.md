# ADR-001 — Base heredada de invexis (NestJS+Prisma) con schema propio

**Estado:** aceptada
**Fecha:** 2026-08-13
**Aprobación:** veredicto del concilio en
`openspec/changes/saas-esqueleto-multi-tenant/concilio.md` (APROBADO CON CAMBIOS, C1/C7/C8),
más decisión directa del usuario del 2026-08-13.

## Contexto

El prompt de origen (`D:\MV\botmef\docs\prompts\prompt-clon-comercial.md`) especifica
"Node + Express + TypeScript". El registro de la fábrica tiene `D:\MV\invexis`: NestJS 11 +
Prisma 7.5 + PostgreSQL, con auth JWT que ya transporta `tenantId`, 234 tests, CI y Docker Compose
funcionando y en mantenimiento activo.

La restricción que domina el producto es el aislamiento entre tenants: el prompt define un bug de
aislamiento como el fin del producto.

## Decisión

Se clona la **estructura** de `invexis/apps/api` y se descarta su dominio ITAM por completo. El
schema Prisma se escribe de cero con `tenant_id` desde la primera migración. Se contradice la letra
del prompt (Express → NestJS).

## Alternativas consideradas

- **Express desde cero, fiel al prompt** — obliga a reescribir auth, tests, CI y Docker que ya
  existen funcionando, y deja el aislamiento como disciplina manual por endpoint. Es exactamente el
  patrón que produjo los 197 filtros repetidos de invexis.
- **NestJS desde cero** — evita heredar decisiones ajenas, pero repite el mismo trabajo de
  infraestructura sin ganancia estructural.
- **Monorepo compartido con botmef** — descartado por el usuario: la línea institucional maneja
  información reservada del MEF y la comercial se vende. No comparten repo, secretos ni despliegue.

## Consecuencias

Se gana auth, CI, tests y Docker ya probados, y un punto único donde aplicar el tenant (guard +
extensión de Prisma), imposible de lograr limpiamente en Express.

Se sacrifica: la curva de NestJS, y la divergencia documentada respecto del prompt de origen.

Se hereda como convención —no como código— el patrón de schema de invexis: `@map("tenant_id")`,
unicidad siempre compuesta con `tenantId`, cascada desde `Tenant`.

**No se hereda su enforcement**, que es el defecto que este proyecto existe para no repetir: en
invexis el filtro por tenant está escrito a mano en 197 puntos de sus services, sin guard central y
sin RLS. Ver ADR-002.

Queda difícil de cambiar después: migrar de NestJS a otro framework una vez escritos los 8 bloques.
No se considera probable ni necesario.
