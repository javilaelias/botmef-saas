# Tareas — MB1 andamiaje

- [x] Monorepo, apps/api clonada sin ITAM, zod único validador, compose PG16+Redis7, prisma.config con dos URLs
- [x] .env.example, .gitignore, CI, README + CERO.ps1/botmef-saas.bat
- [x] lint + test + test:e2e + build verdes; compose up --wait con ambos servicios healthy
- [x] Marcar MB1 como `[x]` en el `tasks.md` del cambio padre (`../saas-esqueleto-multi-tenant/tasks.md`)

## Cierre

Puerta de salida: `/code-review low` — 3 hallazgos: login `findFirst` sin tenant (descartado: se resuelve en MB4,
documentado en comentario), CORS `cb(new Error)`→`cb(null,false)` (corregido), fallback muerto de `JWT_SECRET`
(corregido, `getOrThrow`). QA juvinqa Nivel 1: APROBADO (sin UI, Nivel 2 no aplica). Pendientes anotados por QA para
MB3/CI-e2e: servicio Postgres en CI al sumar `test:e2e`, exigir `MIGRATION_DATABASE_URL`. 15 warnings de lint heredados.
