# Tareas — MB4 enforcement + auth

- [x] Migración `invitaciones` (RLS FORCE + policy) y GRANT INSERT sobre `tenants`
- [x] ALS (`tenantId`, `userId`, `rol`), `TenantGuard`, `JwtAuthGuard` global con `@Public`
- [x] Barrera 1: extensión de Prisma + `PrismaService.runAsTenant`; C3 documentado
- [x] Auth: login con tenantId, bcryptjs, mensaje genérico, throttle en login; helmet
- [x] Alta de tenant cerrada (`ADMIN_PROVISION_KEY`), roles, invitaciones, `auditoria`
- [x] Cifrado AES-256-GCM con versión de clave
- [x] Tests unitarios y e2e
- [x] Marcar MB4 como `[x]` en el `tasks.md` del cambio padre (`../saas-esqueleto-multi-tenant/tasks.md`)

## Cierre

Puerta de salida: `/code-review high` — 10 hallazgos; corregidos 4 (revalidación de tenant/usuario activo en el JWT, tenant activo + bcrypt tras el claim al aceptar invitación, clave AES validada en env de producción, UUID_RE unificado); descartados 6 con motivo (trust proxy = decisión de despliegue, CSP de helmet por defecto en API JSON, INSERT en `tenants` necesario para C6, DUMMY_HASH de coste fijo, interceptor sin user con guard previo, invitaciones duplicadas = menor). QA juvinqa Nivel 1: APROBADO (jest 17/17, e2e 11/11, tsc, eslint 0 errores). Sin UI: Nivel 2 no aplica. Nota de despliegue: fijar `trust proxy` detrás de un proxy; aún no hay mailer (el token de invitación se devuelve al owner).
