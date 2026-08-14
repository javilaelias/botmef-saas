# Tareas — Bloque 1: Esqueleto multi-tenant

5 mini-bloques. Cada uno cierra su ciclo completo (implementar → QA → docs → commit) antes de que
arranque el siguiente. No se agrupan commits.

> Incorpora los 10 cambios exigidos por el concilio (`concilio.md`, veredicto APROBADO CON
> CAMBIOS). Las marcas **(C#)** señalan de dónde viene cada requisito.

---

## MB1 — Andamiaje del repo

- [ ] Monorepo npm workspaces: `apps/api` (NestJS), `apps/web` (Vite+React), `packages/types`
- [ ] Clonar la estructura de `D:\MV\invexis\apps\api` **sin** su dominio: se conservan
      `src/common/`, `src/config/`, `src/modules/auth/`, `src/modules/health/`, `src/prisma/`,
      `test/`, `prisma.config.ts`, `eslint.config.mjs`, `tsconfig*.json`, `nest-cli.json`
- [ ] Borrar todo módulo ITAM heredado (`assets`, `licenses`, `enad`, `rfps`, `vendors`,
      `purchase-requests`, `applications`, `catalog`, `sites`, `reports`, `dashboard`, `agent`)
- [ ] **(C7)** Dejar `zod` como único validador: no arrastrar `class-validator` /
      `class-transformer` del ancestro
- [ ] **(C4)** `docker-compose.yml`: PostgreSQL 16 **sin `pgvector`** + Redis 7, healthchecks,
      puertos 5438 / 6380 — la extensión vectorial llega en el bloque 6
- [ ] **(C8)** `prisma.config.ts` con dos URLs: `DATABASE_URL` (rol de aplicación) y
      `MIGRATION_DATABASE_URL` (rol propietario)
- [ ] `.env.example` con ambas URLs, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `TOKEN_KEY_VERSION`,
      `ADMIN_PROVISION_KEY`, `REDIS_URL`, `PORT=3011`
- [ ] `.gitignore` — bloquear `.env`, `node_modules`, `dist`, y explícitamente `bot_sessions/`
      (credenciales que quedaron commiteadas en el proyecto ancestro)
- [ ] CI (`.github/workflows/ci.yml`) adaptado de invexis: lint + build + test
- [ ] `README.md` + arranque en un comando (`CERO.ps1` / `botmef-saas.bat`, patrón de invexis)
- **Acepta:** `docker compose up` levanta Postgres y Redis con healthcheck verde; `npm run build`
  pasa en `apps/api`; CI verde

## MB2 — Schema Prisma y primera migración

- [ ] `schema.prisma` con las tablas de `design.md` §3, todas con `tenantId`
- [ ] Convenciones: `@map("tenant_id")`, `@@unique([tenantId, …])`, `@@index([tenantId, …])`,
      cascada desde `Tenant`
- [ ] Vocabulario de dominio alineado con `D:\MV\botmef\src\types.ts` (no copiar código)
- [ ] Enums: `PlanTenant`, `EstadoTenant`, `RolUsuario`, `EstadoConversacion`, `DireccionMensaje`,
      `EstadoMensaje`, `CategoriaPlantilla`, `EstadoMeta`
- [ ] `@@unique([tenantId, wamid])` en `mensajes` (defensa anti-duplicado del bloque 2)
- [ ] **(C4)** `kb` **sin** columna `embedding`; nada de `pgvector` en este bloque
- [ ] **(C10)** `auditoria` se crea **con** los escritores que la usan en MB4 (alta de tenant,
      login, invitación) — si por algún motivo no se escribiera, la tabla se difiere
- [ ] **(C5)** `numeros_whatsapp.token_cifrado` acompañado de `token_key_version`
- [ ] Migración inicial `init_multi_tenant` generada por Prisma
- [ ] Seed con dos tenants de prueba (necesario para los tests de MB5)
- **Acepta:** `prisma validate` pasa; `migrate deploy` aplica limpio sobre base vacía;
  `migrate status` sin pendientes; ninguna tabla de negocio sin `tenant_id`

## MB3 — Row Level Security

- [ ] **(C2) SPIKE BLOQUEANTE — va primero, antes de escribir el helper.** Probar que una Client
      Extension de Prisma 7.5 + `@prisma/adapter-pg` se aplica al cliente `tx` dentro de una
      `$transaction` interactiva. **Si no se propaga**, la barrera 1 se muda de la extensión a
      `runInTenantContext`. No se avanza a MB4 sin esta respuesta por escrito
- [ ] Rol de Postgres `app_botmef` **sin `BYPASSRLS`** y que **no** es dueño de las tablas;
      migraciones con el rol propietario vía `MIGRATION_DATABASE_URL`
- [ ] Migración SQL: `ENABLE` + **`FORCE ROW LEVEL SECURITY`** en cada tabla con `tenant_id`
- [ ] Policy `tenant_aislamiento` por tabla, con `USING` y `WITH CHECK`
      (`current_setting('app.tenant_id', true)::uuid`)
- [ ] Helper `runInTenantContext(tenantId, fn)`: `$transaction` +
      `set_config('app.tenant_id', …, true)` — alcance de transacción, **parametrizado**, nunca
      por interpolación de cadena (C3)
- [ ] Test: una conexión que no fijó `app.tenant_id` no lee **ninguna** fila
- [ ] Test: el rol de la aplicación no tiene `BYPASSRLS` (consulta a `pg_roles`)
- **Acepta:** los dos tests pasan; el seed sigue funcionando con el rol propietario; el spike C2
  está respondido y documentado en el propio `design.md`
- **Riesgo vigilado:** fuga de tenant entre peticiones por reuso de conexión del pool. El test de
  MB5 que alterna tenants sobre la misma conexión es el que lo detecta

## MB4 — Enforcement de tenant + auth

- [ ] `AsyncLocalStorage` con el contexto de petición (`tenantId`, `userId`, `rol`)
- [ ] `TenantGuard`: extrae `tenantId` del JWT y abre el contexto; rechaza token sin tenant
- [ ] Barrera 1 según el resultado del spike C2: extensión de Prisma que inyecta `tenantId` en el
      `where` (y en `data` para `create`/`createMany`) — **ningún service escribe `tenantId` a
      mano**, lo contrario de invexis
- [ ] **(C3)** Documentar en el código que `$queryRaw`/`$executeRaw` quedan fuera de la barrera 1
- [ ] **(C1)** Auth email/password con **`bcryptjs`** (no argon2), JWT con `tenantId`, mensaje de
      error genérico — heredado de `invexis/apps/api/src/modules/auth/`
- [ ] **(C5)** `@nestjs/throttler` sobre `/auth/login` y `helmet` habilitado en `main.ts`
- [ ] **(C6)** Alta de tenant **cerrada**: seed o endpoint protegido por `ADMIN_PROVISION_KEY`.
      El registro self-service es del bloque 5
- [ ] Roles `owner` / `agente` / `viewer` con `RolesGuard` (heredado)
- [ ] **(C5)** Invitación de usuarios por email: token **hasheado en base**, de un solo uso y
      **con expiración**
- [ ] **(C5)** Cifrado AES-256-GCM para `token_cifrado`, con `token_key_version` persistida
- [ ] **(C10)** Escritura en `auditoria` de alta de tenant, login e invitación
- [ ] **Sin 2FA** — mini-bloque posterior, por decisión del usuario
- **Acepta:** un usuario autenticado solo opera sobre su tenant; un JWT manipulado con otro
  `tenantId` no accede a datos ajenos (RLS lo corta aunque el guard fallara)

## MB5 — Tests de aislamiento y login

- [ ] **(C9)** La suite de aislamiento va en `test/jest-e2e.json` — el Jest heredado
      (`rootDir: src`, `testRegex: .*\.spec\.ts$`) no recogería estos tests
- [ ] Suite de aislamiento con los dos tenants del seed:
  - [ ] Tenant A no ve conversaciones, mensajes, contactos ni métricas de Tenant B
  - [ ] Peticiones alternando A y B **sobre el mismo pool** no filtran contexto entre sí
  - [ ] Una query escrita deliberadamente **sin** filtro de tenant no devuelve filas ajenas
  - [ ] Escritura con `tenantId` ajeno es rechazada por el `WITH CHECK` de la policy
  - [ ] **(C2)** La barrera 1 filtra correctamente **con RLS deshabilitado** — única forma de
        probar que hay dos barreras y no una disfrazada de dos
- [ ] Pantalla de login en `apps/web` (Vite + React + Tailwind, dirección visual heredada de botmef)
- [ ] i18n ES/EN con **default ES explícito** (no Accept-Language), selector persistente
- [ ] Tema claro/oscuro, default = `prefers-color-scheme`, toggle persistente que prevalece
- [ ] QA nivel 2: smoke de login en ES/EN × claro/oscuro
- **Acepta:** criterio #1 del prompt de origen demostrado por test automático, no a ojo;
  `npm test` y `npm run test:e2e` verdes en CI

---

## Cierre del bloque

- [ ] `ESTADO_PROYECTO.md` y `cola-trabajo.md` en la raíz del repo (juvindocs)
- [ ] ADR-001 y ADR-002 en `adr/` (ya escritos, revisar si el spike C2 los modifica)
- [ ] Ficha `D:\JuvinFactory\registro\botmef-saas.md` + nota en `registro/botmef.md` sobre el clon
- [ ] Archivar el cambio en `openspec/changes/archive/`
- [ ] Repo GitHub privado `javilaelias/botmef-saas` creado y con push inicial
      (**bloqueado**: falta `gh` o un token en la máquina — ver informe)
