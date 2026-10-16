# MB3 — Row Level Security

Subcambio de `saas-esqueleto-multi-tenant`. Alcance: spike C2, permisos del rol `app_botmef`,
`ENABLE`+`FORCE RLS` y policy `tenant_aislamiento` (USING + WITH CHECK) en las 10 tablas con
`tenant_id`, `runInTenantContext` y sus tests. `tenants` queda sin RLS (no tiene `tenant_id`;
el rol de aplicación solo recibe SELECT/UPDATE). Enforcement por petición y auth: MB4.
