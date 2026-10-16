# botmef-saas

SaaS multi-tenant de atención al cliente por WhatsApp (Meta Cloud API). Estado y decisiones:
`ESTADO_PROYECTO.md`, `adr/`, `openspec/`.

## Arranque en un comando

```powershell
.\CERO.ps1        # o botmef-saas.bat  (instala, .env, Postgres+Redis, build)
.\CERO.ps1 -Dev   # además API + Web en desarrollo
```

Requisitos: Node 22, npm 10, Docker.

## Estructura

- `apps/api` — NestJS 11 + Prisma 7 (zod como único validador)
- `apps/web` — Vite + React 19
- `packages/types` — tipos compartidos
- `docker-compose.yml` — PostgreSQL 16 (sin pgvector) + Redis 7

| Servicio | Puerto |
|---|---|
| API | 3011 |
| Web | 3012 |
| PostgreSQL | 5438 |
| Redis | 6380 |

## Variables de entorno

`.env.example` → `apps/api/.env`. Dos URLs de base: `DATABASE_URL` (rol `app_botmef`, runtime, sin
`BYPASSRLS`) y `MIGRATION_DATABASE_URL` (rol propietario, solo migraciones; lo lee
`apps/api/prisma.config.ts`).

## Scripts

`npm run lint` · `npm test` · `npm run test:e2e` (requiere la base arriba) · `npm run build` ·
`npm run ci` (lint + test + build, lo que corre `.github/workflows/ci.yml`).
