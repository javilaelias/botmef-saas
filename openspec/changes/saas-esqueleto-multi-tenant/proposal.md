# Propuesta — Bloque 1: Esqueleto multi-tenant de botmef-saas

**Cambio:** `saas-esqueleto-multi-tenant` · **Bloque:** 1 (de 8 del orden de construcción)
**Estado:** propuesto · **Diseño y ADRs:** `design.md` (ADR-001 base heredada, ADR-002 aislamiento)
**Especificación de origen:** `D:\MV\botmef\docs\prompts\prompt-clon-comercial.md`

## Por qué

`botmef-saas` es la línea comercial de botmef: un SaaS multi-tenant de atención al cliente por
WhatsApp vía Meta Cloud API, cobrado por suscripción. Varias empresas clientes, cada una con su
número, sus agentes y sus datos **completamente aislados**.

Este bloque construye lo único que no se puede agregar después. El prompt de origen lo dice sin
ambigüedad: *"`tenant_id` en cada tabla desde la PRIMERA migración — agregarlo después obliga a
reescribir todas las consultas del sistema"*, y *"un bug de aislamiento acá le muestra los chats
de una empresa a otra, y con eso se termina el producto"*.

No entra ni una pantalla del inbox ni una línea de Meta Cloud API. Si el cimiento se equivoca, todo
lo que se apoye encima se paga en migraciones correctivas sobre datos de clientes reales.

## Qué se hereda, y por qué no se escribe de cero

De `D:\MV\invexis` (`apps/api`, NestJS + Prisma + PostgreSQL 15) se clona la **estructura**, no el
dominio. Lo verificado en el código de invexis al momento de proponer:

| Pieza de invexis | Veredicto | Razón |
|---|---|---|
| Auth JWT (`auth.service.ts`, `jwt.strategy.ts`) con `tenantId` en el payload | **Se hereda** | El token ya transporta el tenant; es el patrón correcto y está probado |
| Estructura de tests (234 pasando), CI (`.github/workflows/ci.yml`), Docker Compose | **Se hereda** | Trabajo resuelto que no aporta nada reescribir |
| Convención de schema: `@map("tenant_id")`, `@@unique([tenantId, …])`, `@@index([tenantId, …])`, cascada desde `Tenant` | **Se hereda como convención** | Es exactamente lo que exige el prompt |
| Modelo de dominio ITAM (`Asset`, `License`, `Enad`, `Rfp`, `Vendor`…) | **Se descarta** | Otro producto; el schema de botmef-saas se escribe de cero |
| **Enforcement de tenant** | **Se corrige, no se hereda** | En invexis el filtro por `tenantId` está repetido a mano en **197 puntos** de sus services, sin guard central y **sin RLS** (verificado: cero `CREATE POLICY` en sus migraciones). Es precisamente el fallo que este bloque existe para no repetir |

De `D:\MV\botmef` se hereda en bloques posteriores: `src/types.ts` (modelo de dominio), el
enmascarado de PII (`server.ts:40-77`) y el contrato de transporte (`motor/transporte/tipos.ts`).
**Nada de eso entra en el bloque 1.**

## Qué se hace (alcance de este cambio, y nada más)

1. **Andamiaje del repo** — monorepo npm workspaces con `apps/api` (NestJS+Prisma), Docker Compose
   de desarrollo (PostgreSQL 16 + Redis), `.env.example`, CI, `.gitignore`.
   Puertos verificados libres: **API 3011 · Web 3012 · Postgres 5438 · Redis 6380**.
2. **Schema Prisma de cero** con las tablas del prompt (`tenants`, `usuarios`, `numeros_whatsapp`,
   `conversaciones`, `mensajes`, `contactos`, `opt_ins`, `plantillas`, `kb`, `consumo`,
   `auditoria`), **todas con `tenant_id` en la primera migración**.
3. **Row Level Security de Postgres** sobre cada tabla con `tenant_id`, con el tenant de la
   petición propagado al contexto de sesión de la conexión.
4. **Enforcement central del tenant**: el `tenantId` sale del JWT y se aplica en un solo lugar
   (guard + extensión de Prisma), no repetido por servicio.
5. **Auth email/password + roles por tenant** (owner / agente / viewer) e invitación de usuarios.
6. **Tests automáticos de aislamiento** entre dos tenants, más una pantalla de login con i18n
   ES/EN (default ES) y tema claro/oscuro, por el estándar de frontend de la fábrica.

## Qué NO se hace (deliberadamente)

| Fuera del bloque 1 | Dónde va |
|---|---|
| Webhook de Meta, validación `X-Hub-Signature-256`, cola BullMQ | Bloque 2 |
| Envío de mensajes, plantillas, ventana de 24 h, estados de entrega | Bloque 3 |
| Inbox real y partición de `SharedInbox.tsx` (166 KB) | Bloque 4 |
| Embedded Signup y onboarding self-service | Bloque 5 |
| IA, RAG sobre la KB, derivación a humano | Bloque 6 |
| Facturación, medición de consumo, pasarela de pago | Bloque 7 |
| Panel de administración de la plataforma | Bloque 8 |
| **2FA** | Mini-bloque propio, antes del primer cliente pago (decisión del usuario, 2026-08-13) |
| Transporte Baileys | **Nunca.** Cliente no oficial, viola los ToS de WhatsApp |
| `mockData.ts`, endpoints de fachada, "LlamaFirewall" tal como está | No se migran |

## Decisiones ya tomadas por el usuario (2026-08-13)

1. Repo nuevo `D:\MV\botmef-saas`, separado de botmef (la línea institucional maneja información
   reservada; la comercial se vende — no comparten repo).
2. Primer entregable = paso 1 del prompt, solo esqueleto multi-tenant.
3. Sin acceso a Meta Cloud API todavía → el bloque 2 construirá contra un simulador de webhooks
   con firma real. No afecta a este bloque.
4. Base heredada de invexis con schema nuevo (ADR-001).
5. Aislamiento de doble barrera: app-level + RLS (ADR-002).
6. Auth sin 2FA en este bloque.
7. Backend puro + login mínimo; las pantallas heredadas llegan en el bloque 4.

## Riesgo y reversibilidad

- **Repo nuevo y vacío**: no hay datos que migrar ni usuarios que romper. El riesgo de este bloque
  no es la reversibilidad, es la **corrección del modelo**: lo que se decida acá se arrastra.
- **RLS + Prisma es el punto delicado.** Prisma usa un pool de conexiones; si el `tenant_id` se
  fija por sesión, una conexión reutilizada puede arrastrar el tenant anterior. `design.md` lo
  resuelve; el riesgo es real y es la razón por la que RLS tiene su propio mini-bloque.
- **RLS puede dar falsa sensación de seguridad**: no aplica al rol dueño de las tablas ni a
  superusuarios. La aplicación debe conectarse con un rol *sin* `BYPASSRLS`, y hay un test que lo
  verifica explícitamente.
- Reversión: `DROP POLICY` / `ALTER TABLE … DISABLE ROW LEVEL SECURITY` deja el sistema en la
  barrera simple, sin pérdida de datos.

## Aceptación

Del prompt de origen, los criterios que aplican a este bloque:

1. **Dos tenants distintos conversando en paralelo sin que ninguno vea nada del otro, probado con
   tests automáticos, no a ojo.** Es el criterio central del bloque.
2. Una query escrita *deliberadamente mal* (sin `tenantId` en el `WHERE`) **no** devuelve filas de
   otro tenant — porque RLS la corta. Es el test que demuestra que la segunda barrera existe.
3. La aplicación se conecta con un rol de Postgres sin `BYPASSRLS` (verificado por test).
4. `prisma validate` pasa; la migración inicial aplica limpia sobre una base vacía.
5. `docker compose up` levanta API + Postgres + Redis con healthcheck, en los puertos asignados.
6. Login funciona en ES y EN, en tema claro y oscuro, con default ES explícito.
7. `npm test` y `npm run build` verdes en CI.
