# Tareas MB5

- [x] Suite de aislamiento en `test/` (recogida por `jest-e2e.json`): A/B sin fuga, alternancia en el mismo pool, query sin filtro, WITH CHECK, barrera 1 con RLS deshabilitado (C2)
- [x] Login en `apps/web` con Tailwind, i18n ES/EN (default ES explícito, persistente), tema claro/oscuro (default prefers-color-scheme, toggle persistente)
- [x] Smoke nivel 2 en navegador real (ES/EN × claro/oscuro)
- [x] Marcar MB5 como `[x]` en el `tasks.md` del cambio padre (`../saas-esqueleto-multi-tenant/tasks.md`)

## Cierre

Puerta de salida: `/code-review low` — 0 hallazgos (nada que corregir ni descartar). QA juvinqa Nivel 1: APROBADO (jest 17/17, e2e 19/19, tsc, build web). Nivel 2: login manejado en navegador real, ES/EN × claro/oscuro, 18/18 checks (idioma por defecto, tema, persistencia, credenciales inválidas, login OK). Nota: la barrera 1 pisa `where.tenantId` con el del contexto; el test afirma que nunca hay filas ajenas.
