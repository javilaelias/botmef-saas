# Tareas — MB2 schema

- [x] schema.prisma con 11 tablas, enums, índices y unicidades compuestas
- [x] Migración `init_multi_tenant` aplicada limpia sobre base vacía; `migrate status` sin pendientes
- [x] Seed con dos tenants de prueba (idempotente)
- [x] Marcar MB2 como `[x]` en el `tasks.md` del cambio padre (`../saas-esqueleto-multi-tenant/tasks.md`)

## Cierre

Puerta de salida: `/code-review low` — 2 hallazgos, ambos descartados: rename `password_hash`→`hash_password` (no había migración previa; la BD estaba vacía) y seed con rol propietario saltando RLS (es el diseño; RLS llega en MB3). QA juvinqa Nivel 1: APROBADO (validate, migrate deploy en BD descartable, status, diff sin deriva, seed idempotente, lint/test/build; sin UI, Nivel 2 no aplica).
