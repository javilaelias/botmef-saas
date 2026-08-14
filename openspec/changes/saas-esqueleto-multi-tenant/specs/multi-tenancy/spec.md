# multi-tenancy — delta Bloque 1

El cimiento de aislamiento del SaaS. No cubre WhatsApp, inbox, IA ni facturación: eso se
especifica en los bloques 2–8.

## ADDED Requirements

### Requirement: Todo dato de negocio pertenece a un tenant

El sistema DEBE atar cada entidad de negocio a un `Tenant` mediante `tenant_id` no nulo, definido
desde la primera migración, y DEBE borrarla en cascada al eliminar el tenant.

#### Scenario: Ninguna tabla de negocio sin tenant

- **WHEN** se inspecciona el esquema Prisma
- **THEN** `usuarios`, `numeros_whatsapp`, `conversaciones`, `mensajes`, `contactos`, `opt_ins`,
  `plantillas`, `kb`, `consumo` y `auditoria` tienen `tenantId` no nulo con relación a `Tenant`
  `onDelete: Cascade`

#### Scenario: La unicidad nunca es global

- **WHEN** dos tenants distintos registran el mismo email de usuario o el mismo teléfono de contacto
- **THEN** ambos registros se crean, porque toda restricción de unicidad es compuesta con `tenantId`

#### Scenario: Borrar un tenant no deja huérfanos

- **WHEN** se elimina un `Tenant`
- **THEN** desaparecen sus usuarios, números, conversaciones, mensajes, contactos, opt-ins,
  plantillas, KB, consumo y auditoría

### Requirement: El tenant de la petición se aplica en un único lugar

El sistema DEBE derivar el `tenantId` del JWT y aplicarlo automáticamente a toda operación de
datos, sin que cada servicio lo repita a mano.

#### Scenario: El filtro no depende de la disciplina del programador

- **WHEN** un servicio consulta cualquier modelo con tenant sin escribir `tenantId` en su `where`
- **THEN** la extensión de Prisma lo inyecta y la consulta devuelve solo filas del tenant de la
  petición

#### Scenario: Un token sin tenant no opera

- **WHEN** llega una petición autenticada cuyo JWT no contiene `tenantId`
- **THEN** el guard la rechaza antes de tocar la base

### Requirement: Row Level Security como segunda barrera

El sistema DEBE tener RLS activo y forzado en cada tabla con `tenant_id`, con el tenant propagado
al contexto de la transacción, de modo que un fallo en la capa de aplicación no exponga datos.

#### Scenario: Una consulta sin filtro no devuelve datos ajenos

- **WHEN** se ejecuta deliberadamente una consulta cruda sin condición de tenant, dentro del
  contexto del tenant A
- **THEN** no devuelve ninguna fila perteneciente al tenant B

#### Scenario: Sin contexto de tenant no se lee nada

- **WHEN** una conexión consulta sin haber fijado `app.tenant_id`
- **THEN** obtiene cero filas de cualquier tabla con RLS

#### Scenario: No se puede escribir en un tenant ajeno

- **WHEN** se intenta insertar una fila con un `tenant_id` distinto al del contexto activo
- **THEN** la policy la rechaza por su cláusula `WITH CHECK`

#### Scenario: La aplicación no puede saltarse RLS

- **WHEN** se consulta `pg_roles` para el rol con el que la API se conecta
- **THEN** ese rol no tiene `BYPASSRLS` y no es dueño de las tablas

#### Scenario: El pool de conexiones no arrastra el tenant

- **WHEN** se atienden peticiones alternadas de los tenants A y B reutilizando conexiones del pool
- **THEN** ninguna petición observa datos del tenant de la petición anterior

### Requirement: Autenticación y roles por tenant

El sistema DEBE autenticar por email y contraseña, emitir un JWT que transporte el tenant y el rol,
y distinguir los roles `owner`, `agente` y `viewer` dentro de cada tenant.

#### Scenario: El alta de tenants no es pública en este bloque

- **WHEN** alguien intenta crear un tenant sin presentar la clave de aprovisionamiento
- **THEN** la petición es rechazada — el registro self-service llega en el bloque 5

#### Scenario: Alta de tenant con su primer usuario

- **WHEN** se aprovisiona un tenant nuevo con la clave de administración
- **THEN** se crea el tenant y su usuario `owner`, y la contraseña queda almacenada como hash
  `bcrypt`, nunca en claro

#### Scenario: Invitación dentro del tenant

- **WHEN** un `owner` invita a un usuario por email
- **THEN** el invitado se da de alta con un token de un solo uso, **hasheado en base y con
  expiración**, y queda atado a ese tenant

#### Scenario: El login no revela qué cuentas existen

- **WHEN** se intenta iniciar sesión con un email inexistente y con una contraseña incorrecta
- **THEN** ambas respuestas son indistinguibles, y los intentos repetidos quedan limitados por
  rate limiting

#### Scenario: Toda acción sensible queda auditada

- **WHEN** se da de alta un tenant, se inicia sesión o se invita a un usuario
- **THEN** queda un registro en `auditoria` atado al tenant correspondiente

#### Scenario: El token de WhatsApp nunca se guarda en claro

- **WHEN** se persiste el token de acceso de un número de WhatsApp
- **THEN** se almacena cifrado con AES-256-GCM

### Requirement: Interfaz bilingüe con tema conmutable

El sistema DEBE ofrecer su interfaz en español e inglés, con español como default explícito, y en
tema claro y oscuro, con la preferencia del sistema como default.

#### Scenario: Default español sin depender del navegador

- **WHEN** un usuario abre el login por primera vez con el navegador configurado en otro idioma
- **THEN** la interfaz se muestra en español, y el selector permite cambiar a inglés sin recargar
  la página

#### Scenario: El tema respeta al sistema y luego al usuario

- **WHEN** un usuario abre la aplicación sin haber elegido tema
- **THEN** se aplica `prefers-color-scheme`; si luego elige uno manualmente, esa elección persiste
  y prevalece
