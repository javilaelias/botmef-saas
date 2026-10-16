# Diseño — Bloque 1: Esqueleto multi-tenant

## 1. ADR-001 — Base heredada de invexis con schema propio

**Contexto.** El prompt de origen especifica "Node + Express + TypeScript". El registro de la
fábrica tiene `invexis`: NestJS + Prisma + PostgreSQL 15, con auth JWT, 234 tests, CI y Docker
Compose ya construidos y en mantenimiento activo.

**Decisión.** Se clona la estructura de `invexis/apps/api` y se descarta su dominio ITAM. El
schema Prisma se escribe de cero. Se contradice la letra del prompt (Express → NestJS) por dos
razones:

1. Reescribir auth, tests, CI y Docker no produce ningún valor que invexis no tenga ya resuelto.
2. NestJS permite aplicar el tenant en un **guard + extensión de Prisma** — un punto único. En
   Express el aislamiento queda como disciplina por endpoint. Dado que el prompt define un bug de
   aislamiento como el fin del producto, el punto único no es preferencia de estilo.

**Consecuencias.** Se adopta la curva de NestJS (módulos, providers, guards). Se hereda su
convención de schema (`@map("tenant_id")`, `@@unique([tenantId, …])`, cascada desde `Tenant`), que
ya coincide con lo que el prompt exige. **No** se hereda su enforcement: en invexis el filtro está
repetido en 197 puntos de sus services. Eso es lo que ADR-002 corrige.

## 2. ADR-002 — Aislamiento de doble barrera (app-level + RLS)

**Contexto.** El prompt deja RLS como "evaluar". La evidencia de invexis muestra a qué lleva no
tenerlo: 197 filtros manuales, cada uno una oportunidad de olvido, sin red debajo.

**Decisión.** Dos barreras independientes:

- **Barrera 1 (aplicación).** El `tenantId` viaja en el JWT. Un guard lo extrae y lo deposita en un
  `AsyncLocalStorage`. Una **extensión de Prisma** lo inyecta en el `where` de toda operación. Ningún
  service escribe `tenantId` a mano.
- **Barrera 2 (base).** RLS activo en cada tabla con `tenant_id`:
  ```sql
  ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
  ALTER TABLE conversaciones FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_aislamiento ON conversaciones
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  ```

**El problema del pool, y cómo se resuelve.** Prisma reutiliza conexiones. Si el tenant se fijara con
`SET app.tenant_id`, quedaría pegado a la conexión y la siguiente petición —de otro tenant— la
heredaría. Es el fallo clásico de RLS con pooling, y produce exactamente la fuga que el producto no
puede permitirse.

Por eso el tenant se fija **con alcance de transacción**:

```ts
prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}::text, true)`;
  return fn(tx);
});
```

El tercer argumento `true` hace el `set_config` **local a la transacción**: al terminar, la conexión
vuelve al pool limpia. Costo aceptado: toda operación con datos de tenant corre dentro de una
transacción.

**Spike bloqueante antes de escribir el helper (C2 del concilio).** Este diseño supone que la
extensión de Prisma se aplica también al cliente `tx` dentro de una `$transaction` interactiva.
Prisma no siempre propagó las extensiones al `tx`; con Prisma 7.5 + `@prisma/adapter-pg` debería
estar resuelto, pero **no se construye MB4 sobre una suposición**. MB3 empieza probándolo. Si no se
propagan, la barrera 1 se muda de la extensión al propio `runInTenantContext`, que aplica el filtro
antes de delegar en `fn(tx)`.

**Resultado del spike C2 (2026-10-16): SÍ se propaga.** Con Prisma 7.10.1 (^7.5) + `@prisma/adapter-pg`,
una extensión `query.$allModels.$allOperations` se ejecuta también para las consultas hechas con el `tx`
de `$extends(...).$transaction(async (tx) => ...)` (contador: 1 llamada fuera de la transacción, 2 tras
una consulta dentro). La barrera 1 puede ser una extensión (MB4). Aun así `runInTenantContext` recibe el
`PrismaClient` y MB4 debe pasarle el cliente ya extendido. Las policies usan
`NULLIF(current_setting('app.tenant_id', true), '')::uuid`: fuera de una transacción el GUC vuelve como
cadena vacía y `''::uuid` lanzaría error en vez de devolver cero filas.

**Límites conocidos de la barrera 1 (C3 del concilio).** No es una red completa, y JuvinDev debe
saber dónde tiene agujeros:

| Camino | ¿Barrera 1? | Qué protege realmente |
|---|:--:|---|
| `findMany`, `update`, `delete`, … | Sí | Extensión inyecta en `where` |
| `create` / `createMany` | Parcial | No hay `where`: se inyecta en `data`; quien valida es el `WITH CHECK` de la policy |
| `$queryRaw` / `$executeRaw` | **No** | Solo RLS. Incluye al propio helper de `set_config` |

Que el mecanismo de aislamiento viaje por la ruta que la barrera 1 no cubre es aceptable —fija el
contexto, no lee datos— pero obliga a que ese `set_config` vaya **siempre parametrizado**, nunca
por interpolación de cadena.

**Cómo se prueba que hay dos barreras y no una disfrazada de dos.** Si la barrera 1 fallara en
silencio, los tests de aislamiento seguirían pasando: RLS haría el trabajo y nadie lo notaría hasta
el día que alguien conecte con el rol propietario. Por eso MB5 incluye un test que verifica que la
barrera 1 filtra **con RLS deshabilitado**.

**`FORCE ROW LEVEL SECURITY` no es opcional.** Sin él, el rol dueño de las tablas ignora las
policies. Y la aplicación se conecta con un rol dedicado **sin `BYPASSRLS` y que no es dueño de las
tablas** — las migraciones corren con otro rol. Un test verifica esta separación: es la diferencia
entre tener RLS y creer que se tiene.

**Consecuencias.** Un olvido en el código ya no expone datos. A cambio: todo pasa por transacción,
las migraciones y el seed necesitan el rol propietario, y si algún día entra pgBouncer en modo
`transaction` hay que revalidar el esquema de conexión.

## 3. Modelo de datos

Las tablas del prompt de origen, con `tenant_id` desde la primera migración y las convenciones de
invexis. `tenants` es la raíz; todo lo demás cascadea desde ella.

```
tenants           id, nombre, plan, estado, creado_en
usuarios          id, tenant_id, email, hash_password, rol, estado
numeros_whatsapp  id, tenant_id, phone_number_id, waba_id, display_number,
                  token_cifrado, calidad, limite_mensajeria
conversaciones    id, tenant_id, numero_id, contacto_id, estado, ventana_expira_en,
                  asignada_a, etiquetas[], creada_en
mensajes          id, tenant_id, conversacion_id, direccion, wamid, tipo, texto,
                  media_url, estado, creado_en
contactos         id, tenant_id, telefono, nombre, atributos jsonb
opt_ins           id, tenant_id, contacto_id, canal, prueba jsonb, estado, creado_en
plantillas        id, tenant_id, nombre, categoria, idioma, estado_meta, cuerpo, variables[]
kb                id, tenant_id, categoria, pregunta, respuesta   (embedding → bloque 6)
consumo           id, tenant_id, periodo, conversaciones_por_categoria jsonb, costo
auditoria         id, tenant_id, usuario_id, accion, entidad, entidad_id, creado_en
```

Notas de modelado que no vienen del prompt:

- **`token_cifrado`**: cifrado en aplicación (AES-256-GCM, clave desde `.env`), no texto plano. El
  prompt lo exige explícitamente. Se guarda la **versión de clave** junto al ciphertext (C5): sin
  eso, rotar la clave obliga a descifrar todo a mano.
- **`kb.embedding` NO se crea en este bloque (C4 del concilio).** `pgvector` obliga a
  `Unsupported("vector")` en Prisma, que impone restricciones al Client desde el día uno a cambio
  de cero valor hasta el bloque 6. `kb` se crea sin columna vectorial; agregarla después es una
  migración aditiva trivial.
- **`auditoria` solo se crea si tiene escritor (C10).** En este bloque registra alta de tenant,
  login e invitación. Una tabla de auditoría vacía aparenta una trazabilidad que no existe, y el
  cumplimiento es el diferenciador que el prompt define como defendible.
- **`wamid` único por tenant** (`@@unique([tenantId, wamid])`): Meta reenvía webhooks ante fallo de
  entrega; es la defensa contra mensajes duplicados que necesitará el bloque 2.
- **Unicidad siempre compuesta con `tenantId`**: dos tenants distintos pueden tener el mismo
  contacto o el mismo email de usuario.

## 4. Roles

`owner` (administra el tenant, factura, invita) · `agente` (atiende conversaciones) ·
`viewer` (lee métricas, no responde). Es el mínimo del bloque 1; el prompt no fija esta lista y se
puede ampliar sin migración correctiva porque es un enum por tenant.

## 5. Puertos

Verificados libres en la máquina el 2026-08-13 (3010, 5436 y 5437 estaban ocupados por otros
proyectos del catálogo):

| Servicio | Puerto |
|---|---|
| API | 3011 |
| Web | 3012 |
| PostgreSQL | 5438 |
| Redis | 6380 |

Redis se levanta en este bloque aunque BullMQ recién se use en el bloque 2: es una línea de
Compose ahora, contra rehacer el entorno después.

## 6. Decisiones heredadas y ambigüedades cerradas (concilio)

Versiones reales verificadas en `invexis/apps/api/package.json`, que este proyecto adopta:
NestJS 11 · Prisma 7.5 con `@prisma/adapter-pg` · `pg` 8.20 · TypeScript 5.7 · Jest 30.

| Punto | Decisión |
|---|---|
| Hash de contraseña | **`bcryptjs`** (C1). Es lo que usa el código heredado y es JS puro: `argon2` exige compilación nativa, fricción real en Windows. Cambiar de algoritmo no aporta nada a este bloque |
| Validación | **`zod` únicamente** (C7). Invexis arrastra `zod` y `class-validator` a la vez; copiar esa ambigüedad sería deuda desde el primer commit |
| Dos roles de base | La URL de aplicación (sin `BYPASSRLS`) y la de migración (propietaria) se resuelven en **`prisma.config.ts`** (C8), patrón que invexis ya tiene. Prisma no admite dos URLs cambiando una variable |
| Headers y rate limiting | `helmet` y `@nestjs/throttler` ya están en las dependencias heredadas: se habilitan, no se instalan (C5) |
| Mensaje de login fallido | Genérico, sin distinguir usuario inexistente de contraseña incorrecta (heredado de invexis: `'Invalid credentials'`) — evita enumeración de usuarios |
| Alta de tenants | **Cerrada en este bloque** (C6): seed o endpoint protegido por clave de administración. El registro self-service es del bloque 5 |
| Vocabulario del schema | Se respetan los nombres de dominio de `D:\MV\botmef\src\types.ts` (`OptInProof`, `MetaTemplate`, `ChatSession`) para que el bloque 4 no tenga que traducir al conectar la UI heredada |
