# MB1 — Andamiaje del repo (subcambio de `saas-esqueleto-multi-tenant`)

Alcance: solo el mini-bloque MB1 de `../saas-esqueleto-multi-tenant/tasks.md`. Sin schema real (MB2),
sin RLS (MB3), sin enforcement de tenant (MB4).

Entrega: monorepo npm workspaces (`apps/api`, `apps/web`, `packages/types`); `apps/api` clonada de
invexis sin dominio ITAM (common, config, auth, health, prisma, test); `zod` como único validador (C7);
`docker-compose.yml` Postgres 16 sin pgvector (C4) + Redis 7, puertos 5438/6380, healthchecks; rol
`app_botmef` sin BYPASSRLS creado en el init; `prisma.config.ts` con `MIGRATION_DATABASE_URL`/`DATABASE_URL`
(C8); `.env.example`; `.gitignore` con `bot_sessions/`; CI; `README.md`, `CERO.ps1`, `botmef-saas.bat`.

Desvíos: schema Prisma mínimo (Tenant/Usuario) solo para que auth compile — MB2 lo reemplaza; reglas
`no-unsafe-*` de ESLint en `warn` (invexis no linteaba la API en CI).
