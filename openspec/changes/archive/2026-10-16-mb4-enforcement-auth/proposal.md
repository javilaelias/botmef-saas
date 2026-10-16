# MB4 — Enforcement de tenant + auth

Subcambio de `saas-esqueleto-multi-tenant`. Alcance: `AsyncLocalStorage` de petición, `TenantGuard`,
barrera 1 como extensión de Prisma (el spike C2 dio que SÍ se propaga al `tx`), auth email/password
con `bcryptjs`, roles, throttler + helmet, invitación con token hasheado/expirable/un solo uso (tabla
`invitaciones` con RLS), alta de tenant cerrada por `ADMIN_PROVISION_KEY`, AES-256-GCM con versión de
clave y escritura en `auditoria`. Sin 2FA.

Decisiones: el login recibe `tenantId` (los usuarios están bajo RLS: sin tenant no hay filas). El
token de invitación es `<tenantId>.<aleatorio>`; solo el hash del aleatorio se guarda. No hay mailer
aún: el token se devuelve al owner que invita. El `ttl` del throttler de v6 es en ms (se corrige).
