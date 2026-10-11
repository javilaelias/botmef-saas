# Cola de trabajo — botmef-saas

**Bloque 1 `saas-esqueleto-multi-tenant`** · Origen: `D:\MV\botmef\docs\prompts\prompt-clon-comercial.md` · Alta: 2026-08-13
Alcance, diseño, aceptación y riesgo: `openspec/changes/saas-esqueleto-multi-tenant/`.

El prompt de origen fija 8 bloques de construcción; este es el **paso 1**: esqueleto multi-tenant.
Los ítems de abajo son las piezas de ese paso, una por ítem — no es alcance inventado aquí.

Agentes del bloque: `juvininfra` (Docker, puertos, `.env`, estructura del monorepo clonado) →
`juvindev` → `juvinqa` → `juvindocs`. **No** se activan `juvinnotebook` (el prompt técnico ya está
escrito), `juvindiseno` (dirección visual heredada de botmef, sin re-benchmark) ni `juvinscout`
(el prompt ya trae el análisis competitivo).

**Concilio: ya realizado**, profundidad completa + lentes de Seguridad y Planificación.
Veredicto **APROBADO CON CAMBIOS** (`openspec/changes/saas-esqueleto-multi-tenant/concilio.md`);
los 10 cambios exigidos (C1–C10) **ya están aplicados** a `design.md`, `tasks.md` y el spec.
**ADR: ya escritos** — ADR-001 (base heredada) y ADR-002 (aislamiento doble barrera).

- [ ] MB1 — Andamiaje del repo: monorepo npm workspaces, estructura de `invexis/apps/api` sin su dominio ITAM, Docker Compose (Postgres 16 + Redis 7, puertos 5438/6380), `prisma.config.ts` con dos URLs de base, `.env.example`, CI, arranque en un comando. `zod` como único validador (C7); **sin `pgvector`** (C4).
- [ ] MB2 — Schema Prisma de cero con las 11 tablas del prompt, todas con `tenantId` desde la primera migración, unicidad siempre compuesta, `@@unique([tenantId, wamid])` en `mensajes`. `kb` sin columna `embedding` (C4); `auditoria` solo si tiene escritor (C10). Seed con dos tenants de prueba.
- [ ] MB3 — Row Level Security. **Empieza por el spike bloqueante (C2)**: verificar que las Client Extensions de Prisma 7.5 + `adapter-pg` se aplican dentro de `$transaction` interactiva. Luego rol sin `BYPASSRLS`, `FORCE ROW LEVEL SECURITY`, policies con `USING` + `WITH CHECK`, y `runInTenantContext` con `set_config` de alcance de transacción y parametrizado.
- [ ] MB4 — Enforcement central del tenant (`AsyncLocalStorage` + `TenantGuard` + barrera 1 según el resultado del spike) y auth: email/password con `bcryptjs` (C1), roles owner/agente/viewer, throttler + helmet (C5), invitación con token hasheado y expirable (C5), alta de tenant cerrada por clave de administración (C6), cifrado AES-256-GCM con versión de clave (C5), escritura en `auditoria` (C10). **Sin 2FA** — mini-bloque posterior.
- [ ] MB5 — Tests de aislamiento en `test/jest-e2e.json` (C9): A no ve nada de B, alternancia sobre el mismo pool sin fuga, query sin filtro que no devuelve filas ajenas, escritura ajena rechazada por `WITH CHECK`, y **la barrera 1 filtrando con RLS deshabilitado** (C2). Más pantalla de login con i18n ES/EN (default ES) y tema claro/oscuro.

## Lanzador (run.bat)

- [ ] item 6: `run.bat` en la raiz que levanta la app completa: BD (docker compose, espera a que este
      sana), backend y frontend, cada uno en su ventana, y abre el navegador; solo las piezas que
      existan. Si ya hay un lanzador que lo hace (`run_project.bat`, `levantar.bat`...), `run.bat`
      solo lo llama. Nunca destructivo: sin `down -v`, seeds ni reset de BD. `pause` solo ante
      error. Si el puerto de la BD esta ocupado, lo dice y no mata nada. Mecanico: concilio de 2,
      `/code-review low`. Evidencia: correrlo, citar las URLs que respondieron y detener despues
      solo lo que levanto la prueba.

## Obligaciones que el concilio dejó vigentes

No son sugerencias: son deuda contraída por la propuesta que el mini-bloque indicado debe pagar.

- **MB3 — el spike C2 es bloqueante.** Si las Client Extensions no se propagan al `tx`, la barrera 1
  se muda de la extensión a `runInTenantContext`. No se construye MB4 sobre una suposición, y la
  respuesta se documenta por escrito en `design.md`.
- **MB5 — probar que hay dos barreras, no una disfrazada de dos.** Si la barrera 1 fallara en
  silencio, los tests de aislamiento igual pasarían porque RLS haría el trabajo. El test con RLS
  deshabilitado es el único que distingue ambos casos.
- **Todo el bloque — `$queryRaw`/`$executeRaw` quedan fuera de la barrera 1** (C3). Ahí solo
  protege RLS, y el propio helper de `set_config` viaja por esa ruta: debe ir siempre
  parametrizado, nunca por interpolación de cadena.

## Al cerrar el bloque

- `ESTADO_PROYECTO.md` actualizado (juvindocs) · cambio archivado en `openspec/changes/archive/`
- Ficha `D:\JuvinFactory\registro\botmef-saas.md` + nota en `registro/botmef.md`
- Repo GitHub privado creado y push inicial — **hoy bloqueado**, ver `ESTADO_PROYECTO.md` §Bloqueos
