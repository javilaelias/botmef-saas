# Tareas — MB3 RLS

- [x] Spike C2 respondido y documentado en `design.md` del cambio padre
- [x] Migración `rls_tenant_aislamiento`: grants a `app_botmef`, ENABLE + FORCE RLS, policy con USING y WITH CHECK
- [x] `runInTenantContext` (set_config parametrizado, alcance de transacción)
- [x] Tests: sin `app.tenant_id` no lee filas; sin BYPASSRLS; no dueño; alternancia de tenants; WITH CHECK
- [x] Marcar MB3 como `[x]` en el `tasks.md` del cambio padre (`../saas-esqueleto-multi-tenant/tasks.md`)

## Cierre

Puerta de salida: `/code-review low` — 0 hallazgos. QA juvinqa Nivel 1: APROBADO (jest 8/8, eslint, tsc, seed con rol propietario, FORCE RLS y policies verificadas en la BD viva; sin UI, Nivel 2 no aplica).
