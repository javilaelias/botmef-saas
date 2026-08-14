# Concilio — `saas-esqueleto-multi-tenant`

**Fecha:** 2026-08-13 · **Profundidad:** completa (5 revisores) + lentes condicionales
**Seguridad** y **Planificación** · **Motivo:** primer bloque de un proyecto nuevo, arquitectura
nueva, aislamiento de datos entre clientes que pagan.

## VEREDICTO: APROBADO CON CAMBIOS

Diez cambios exigidos (C1–C10) antes de que JuvinDev escriba una línea. Ninguno invalida el
enfoque; cuatro corrigen afirmaciones de la propuesta que **no coinciden con el código real** de
`D:\MV\invexis`, verificado durante esta revisión.

---

## Lentes obligatorias

### Arquitectura de software — APROBADO CON CAMBIOS

El enfoque es correcto y corrige el defecto real del ancestro: en invexis el filtro por tenant
está repetido en 197 puntos de sus services, sin punto único. Centralizarlo en guard + extensión
de Prisma es la decisión adecuada.

**Pero el diseño tiene un hueco no declarado.** Una extensión de Prisma que inyecta `where`:

1. **No intercepta `$queryRaw` ni `$executeRaw`.** Ahí la única defensa es RLS. La propuesta lo
   sugiere pero no lo dice; JuvinDev necesita saberlo explícitamente, porque el helper de MB3
   (`set_config`) usa `$executeRaw` — es decir, el propio mecanismo de aislamiento pasa por la
   ruta que la barrera 1 no cubre. → **C3**
2. **`create` y `createMany` no tienen `where`.** La inyección ahí va en `data`, es un camino de
   código distinto, y es donde `WITH CHECK` de la policy hace el trabajo real. → **C3**

**Riesgo técnico que puede tumbar el diseño y hay que validar ANTES de construir sobre él:** el
helper `runInTenantContext` envuelve todo en `$transaction` interactiva, y la barrera 1 vive en
una Client Extension. Históricamente Prisma no propagaba las extensiones al cliente `tx` dentro de
transacciones interactivas. Con Prisma 7.5 + `@prisma/adapter-pg` (versiones reales de invexis)
debería estar resuelto, pero **el concilio no lo da por cierto**. → **C2**

### Arquitectura de solución / stack — APROBADO

Heredar NestJS+Prisma de invexis en vez de escribir Express desde cero está justificado y el
ADR-001 argumenta la desviación del prompt correctamente. El stack real verificado —NestJS 11,
Prisma 7.5 con `@prisma/adapter-pg`, `pg` 8.20, TypeScript 5.7, Jest 30— es moderno y coherente.

Dos piezas ya instaladas en invexis que la propuesta ignora y debería heredar: **`helmet`** y
**`@nestjs/throttler`**. Son gratis y el lente de Seguridad las exige (→ C5).

Ambigüedad de stack a cerrar: invexis arrastra **`zod` y `class-validator` a la vez**. Copiar esa
ambigüedad a un proyecto nuevo es deuda desde el día uno. → **C7**

---

## Lentes de revisión

### Reutilización — APROBADO CON CAMBIOS

Reuso bien identificado y bien acotado (estructura sí, dominio ITAM no). Correcciones:

- **`argon2` es una invención de la propuesta.** El código real de invexis usa **`bcryptjs`**
  (`auth.service.ts:3,31`). Cambiar de algoritmo no está justificado por ninguna decisión del
  usuario, y `argon2` necesita compilación nativa —fricción real en la máquina Windows donde
  corre esto—, mientras `bcryptjs` es JS puro. → **C1**
- **No se reutiliza `CERO.ps1` / `invexis.bat`.** El registro los marca explícitamente como
  "entregable de continuidad" (arranque en un comando). El rollout headless se beneficia de tener
  el mismo patrón. → recomendado en MB1, no bloqueante.
- **`D:\MV\botmef\src\types.ts` no se consulta en MB2.** No hay que copiar código, pero el
  modelo de dominio de botmef (`ChatSession`, `OptInProof`, `CRMData`, `MetaTemplate`) es
  vocabulario ya pensado que el schema debería respetar para que el bloque 4 no tenga que traducir
  nombres al conectar la UI heredada. → recomendado en MB2.

### Producto / UX — APROBADO CON CAMBIOS

El alcance resuelve el problema real y la separación backend/UI es correcta: mostrar pantallas
sin datos es justo lo que el prompt manda no hacer.

**Hueco de producto:** el onboarding self-service es del bloque 5, pero el bloque 1 permite
"registro de tenant nuevo" (spec, escenario *Alta de tenant con su primer usuario*). Eso es un
endpoint público de creación de cuentas **cuatro bloques antes** de que exista el onboarding —
cualquiera crea tenants en tu base. → **C6**

### Riesgo / QA — APROBADO CON CAMBIOS

Los criterios de aceptación son verificables y el test de "query deliberadamente mal escrita" es
exactamente la prueba correcta. Faltan tres cosas:

- El test del pool alternando tenants (el más importante del bloque) es **e2e**, y el Jest
  heredado tiene `rootDir: src` con `testRegex: .*\.spec\.ts$` — no lo recogería. Va en
  `test/jest-e2e.json`. → **C9**
- **Dos URLs de base** (app sin `BYPASSRLS` / migración con propiedad) no es algo que Prisma
  soporte cambiando una variable: hay que resolverlo en `prisma.config.ts` — que invexis ya tiene.
  Sin esto, MB3 se traba. → **C8**
- Plan de reversa: correcto (`DROP POLICY` deja la barrera simple, sin pérdida de datos).

Sin infraestructura compartida ni servidores remotos: todo local en Docker. Sin riesgo de tocar
producción ajena.

### Simplicidad — APROBADO CON CAMBIOS

Cinco mini-bloques está bien dimensionado; separar RLS del schema es correcto porque son riesgos
distintos.

**Sobre-diseño detectado:** `pgvector` se instala y `kb.embedding` se declara en MB2 para no
usarse hasta el **bloque 6**. Una columna de tipo vectorial obliga a `Unsupported("vector")` en
Prisma, y los modelos con campos `Unsupported` cargan restricciones en el Client desde el día uno,
a cambio de cero valor durante cinco bloques. Agregar la columna después es una migración aditiva
trivial. → **C4**

**No es sobre-diseño** (revisado y confirmado): la doble barrera. Es la decisión del usuario y el
lente de Seguridad la respalda.

---

## Lentes condicionales

### SEGURIDAD — APROBADO CON CAMBIOS

Lo que está bien: `FORCE ROW LEVEL SECURITY` (sin él las policies no aplican al dueño de las
tablas — bien pescado), rol sin `BYPASSRLS` con test que lo verifica, `set_config` con alcance de
transacción para no contaminar el pool, tokens de Meta cifrados, `WITH CHECK` además de `USING`.

Faltantes:

- **Sin rate limiting en el login.** Fuerza bruta contra `/auth/login` sin coste. `@nestjs/throttler`
  ya está en las dependencias heredadas. → **C5**
- **Token de invitación**: la propuesta dice "un solo uso" pero no dice **hasheado en base ni con
  expiración**. Un token de invitación en claro es una credencial en claro. → **C5**
- **`TOKEN_ENCRYPTION_KEY` sin rotación**: aceptable para el bloque 1, pero el campo debe guardar
  la versión de clave junto al ciphertext, o rotar obliga a descifrar todo a mano después. → **C5**
- **Tabla `auditoria` sin ningún escritor** en el bloque 1. Una tabla de auditoría vacía es peor
  que no tenerla: aparenta trazabilidad inexistente — y el prompt vende cumplimiento como el
  diferenciador defensible del producto. → **C10**

**Revisión ofensiva breve** (superficie del bloque 1: login, registro, invitación; sin exposición
pública todavía, todo local):

| Vector | Estado |
|---|---|
| JWT manipulado con `tenantId` ajeno | Cubierto — RLS corta aunque el guard fallara |
| Fuerza bruta en login | **Descubierto** → C5 |
| Registro masivo de tenants | **Descubierto** → C6 |
| Fuga por reuso de conexión del pool | Cubierto por diseño, **pendiente de probar** → C2 |
| SQL injection vía `$executeRaw` del helper | Cubierto: `set_config` va parametrizado (verificar que se mantenga así) |
| Enumeración de usuarios por respuesta de login | No contemplado — invexis ya devuelve mensaje genérico ("Invalid credentials"); heredarlo |

### PLANIFICACIÓN (PM) — APROBADO

El orden de los 5 mini-bloques es correcto y cada uno es verificable por sí solo. Revisé la
objeción obvia —MB3 (RLS) antes de MB4 (guard/auth), cuando el `tenant_id` de la sesión lo produce
MB4— y **no procede**: los tests de MB3 usan conexiones directas sin HTTP, así que MB3 cierra su
ciclo sin depender de MB4. Está bien como está.

El orden de los 8 bloques del prompt de origen se respeta. La decisión de construir el bloque 2
contra un simulador de webhooks con firma real, sin acceso a Meta, es la correcta: desbloquea 3
bloques de trabajo sin depender de una verificación de negocio que no está en manos del equipo.

---

## Cambios exigidos

| # | Cambio | Dónde |
|:--:|---|---|
| **C1** | `bcryptjs` en vez de `argon2` — es lo que usa el código heredado y no requiere compilación nativa | tasks MB4 |
| **C2** | **Spike bloqueante al inicio de MB3**: probar que las Client Extensions se aplican dentro de `$transaction` interactiva en Prisma 7.5 + `adapter-pg`. Si no se propagan, barrera 1 pasa al helper `runInTenantContext` en vez de la extensión. No se construye MB4 sobre una suposición | tasks MB3, design §2 |
| **C3** | Declarar explícitamente los límites de la barrera 1: no cubre `$queryRaw`/`$executeRaw` (ahí solo RLS) y en `create`/`createMany` inyecta en `data`, no en `where` | design §2 |
| **C4** | Diferir `pgvector` y `kb.embedding` al bloque 6. `kb` se crea sin columna vectorial | tasks MB1/MB2, design §3 |
| **C5** | Seguridad de auth: `@nestjs/throttler` en login, `helmet` habilitado, token de invitación **hasheado y con expiración**, versión de clave junto al token cifrado | tasks MB4 |
| **C6** | Cerrar el alta pública de tenants en el bloque 1 (seed o endpoint protegido por clave de administración). El registro self-service es del bloque 5 | tasks MB4, spec |
| **C7** | Elegir **un** validador —`zod`— y no arrastrar `class-validator` del ancestro | tasks MB1 |
| **C8** | Resolver las dos URLs de base (app / migración) en `prisma.config.ts`, patrón ya existente en invexis | tasks MB1/MB3 |
| **C9** | Los tests de aislamiento van en `test/jest-e2e.json`; el `testRegex` heredado (`rootDir: src`) no los recogería | tasks MB5 |
| **C10** | O `auditoria` registra login/invitación/alta de tenant en este bloque, o la tabla se difiere. Sin escritor no se crea | tasks MB2/MB4 |

## El mayor riesgo

**La barrera 1 podría no aplicarse dentro de las transacciones que la barrera 2 necesita.** Si las
Client Extensions no se propagan al `tx`, el sistema queda apoyado solo en RLS sin que nadie lo
note —porque los tests de aislamiento **igual pasarían**, ya que RLS hace el trabajo—. Se
descubriría el día que alguien desactive RLS en un entorno o conecte con el rol propietario.

**Mitigación (C2):** el spike va **primero** en MB3, antes de escribir el helper, y se agrega un
test que verifique que la barrera 1 filtra **con RLS deshabilitado** — la única forma de probar que
las dos barreras existen de verdad y no una sola disfrazada de dos.

## Qué reutilizar en vez de escribir desde cero

- `invexis/apps/api`: `src/common/` (guards, decorators, middleware), `src/modules/auth/`,
  `src/prisma/`, `prisma.config.ts`, `eslint.config.mjs`, `tsconfig*`, CI, Docker Compose.
- `invexis`: `CERO.ps1` + `invexis.bat` como patrón de arranque en un comando.
- `botmef/src/types.ts`: vocabulario de dominio para nombrar el schema (no copiar código).
- Estándar de i18n/tema de la fábrica (`juvindiseno.md`/`juvindev.md`): ya es obligatorio, no se
  redefine por proyecto.
