# ADR-002 — Aislamiento de tenants con doble barrera (aplicación + RLS)

**Estado:** aceptada
**Fecha:** 2026-08-13
**Aprobación:** veredicto del concilio en
`openspec/changes/saas-esqueleto-multi-tenant/concilio.md` (APROBADO CON CAMBIOS, C2/C3),
más decisión directa del usuario del 2026-08-13.

## Contexto

El prompt de origen deja Row Level Security como "evaluar". La evidencia del proyecto ancestro
muestra a qué lleva no tenerlo: en `D:\MV\invexis` el filtro por `tenantId` está repetido a mano en
**197 puntos** de sus services, sin punto único y sin RLS (verificado: cero `CREATE POLICY` en sus
migraciones). Cada uno de esos puntos es una oportunidad de olvido, sin red debajo.

Para un SaaS donde varias empresas clientes conversan con sus propios clientes por WhatsApp, un
olvido no produce un bug: le muestra los chats de una empresa a otra.

## Decisión

Dos barreras independientes, no una:

- **Barrera 1 (aplicación).** El `tenantId` viaja en el JWT, un guard lo deposita en un
  `AsyncLocalStorage` y una extensión de Prisma lo inyecta automáticamente. Ningún service escribe
  `tenantId` a mano.
- **Barrera 2 (base).** RLS con `ENABLE` + **`FORCE ROW LEVEL SECURITY`** en cada tabla con
  `tenant_id`, policies con `USING` y `WITH CHECK`, y el tenant fijado con
  `set_config('app.tenant_id', …, true)` — **alcance de transacción**, para que la conexión vuelva
  limpia al pool.

La aplicación se conecta con un rol **sin `BYPASSRLS` que no es dueño de las tablas**; las
migraciones usan un rol propietario distinto.

## Alternativas consideradas

- **Solo barrera de aplicación** — más rápido de construir y RLS se puede agregar después sin
  reescribir queries. Descartada: mientras tanto, un solo olvido expone datos de un cliente a otro,
  y es precisamente el estado en que quedó invexis.
- **Base o schema por tenant** — aislamiento físico total, imposible de romper por un bug de query.
  Descartada por costo operativo: migrar N bases en cada despliegue y el costo por tenant se
  vuelven prohibitivos justo cuando el negocio empieza a funcionar.
- **`SET app.tenant_id` a nivel de sesión** — más simple de escribir. **Descartada por
  incorrecta**: Prisma reutiliza conexiones, el valor queda pegado a la conexión y la siguiente
  petición —de otro tenant— lo hereda. Es el fallo clásico de RLS con pooling.

## Consecuencias

Se gana: un olvido en el código deja de exponer datos.

Se sacrifica: toda operación con datos de tenant corre dentro de una transacción; el seed y las
migraciones necesitan el rol propietario; si algún día entra pgBouncer en modo `transaction` hay
que revalidar el esquema de conexión.

**Límites conocidos de la barrera 1** (exigidos por el concilio, C3): no intercepta `$queryRaw` ni
`$executeRaw` —ahí solo protege RLS— y en `create`/`createMany` inyecta en `data`, no en `where`,
donde quien valida realmente es el `WITH CHECK` de la policy.

**Riesgo abierto hasta el spike de MB3** (C2): el diseño supone que la extensión de Prisma se
aplica al cliente `tx` dentro de una `$transaction` interactiva. Si no se propagara, la barrera 1
se muda al helper `runInTenantContext`. Si esto fallara en silencio, los tests de aislamiento
seguirían pasando —RLS haría el trabajo— y el sistema quedaría con una sola barrera creyendo tener
dos; por eso existe un test que verifica que la barrera 1 filtra **con RLS deshabilitado**.

Reversión: `DROP POLICY` / `DISABLE ROW LEVEL SECURITY` deja el sistema en la barrera simple, sin
pérdida de datos.
