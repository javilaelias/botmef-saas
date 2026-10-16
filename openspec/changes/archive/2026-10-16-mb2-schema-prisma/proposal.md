# MB2 — Schema Prisma y primera migración (subcambio de `saas-esqueleto-multi-tenant`)

Alcance: solo MB2 de `../saas-esqueleto-multi-tenant/tasks.md`. Sin RLS (MB3), sin enforcement (MB4).

Entrega: `schema.prisma` con las 11 tablas de `design.md` §3, todas con `tenant_id` (salvo la raíz `tenants`),
unicidad siempre compuesta con `tenantId`, `@@unique([tenantId, wamid])` en `mensajes`, enums de dominio,
`token_key_version` junto a `token_cifrado` (C5), `kb` sin `embedding` (C4), `auditoria` creada porque MB4 trae
sus escritores (C10, tarea explícita en MB4). Migración `init_multi_tenant` y seed con dos tenants.

Desvío: `Usuario` conserva `nombre`, `activo` y `ultimoLogin` del andamiaje de MB1 porque `auth` los usa.
