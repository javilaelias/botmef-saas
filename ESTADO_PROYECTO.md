# ESTADO_PROYECTO — botmef-saas

**Modo:** Mantenimiento · **Actualizado:** 2026-10-16 (MB1 cerrado)

SaaS multi-tenant de atención al cliente por WhatsApp vía **Meta Cloud API**, cobrado por
suscripción. Línea comercial de `botmef`; la institucional queda en `D:\MV\botmef` como asistente
de `gti-app`.

> Este archivo es **estado, no bitácora**. El detalle de cada cambio cerrado vive en
> `openspec/changes/archive/`. La documentación técnica vive en `README.md` y `docs/`.

## Estado

| Área | Estado | Puntero |
|---|---|---|
| Código | **MB1 hecho**: monorepo, apps/api sin ITAM, compose PG16+Redis7, CI, CERO.ps1. Schema real = MB2 | `apps/`, `openspec/changes/archive/2026-10-16-mb1-andamiaje-repo/` |
| Bloque 1 (esqueleto multi-tenant) | Propuesto y **aprobado con cambios** por concilio; 10 cambios ya aplicados | `openspec/changes/saas-esqueleto-multi-tenant/` |
| Decisiones de arranque | ADR-001 (base heredada) · ADR-002 (aislamiento doble barrera) | `adr/` |
| Repo remoto | ✅ `javilaelias/botmef-saas` existe y tiene el commit inicial (verificado 2026-10-13). Local va 2 commits adelante (ítem `run.bat` de la cola), sin pushear | `origin/master` |
| Cierre de fábrica | ⏳ Sin `mv.json`, sin respaldo en Drive, sin alta en el catálogo — se hace con `cerrar-proyecto.ps1` | ver "Bloqueos" |
| Especificación de origen | Prompt técnico completo, 8 bloques de construcción | `D:\MV\botmef\docs\prompts\prompt-clon-comercial.md` |
| Dirección visual | Heredada de `botmef` — **`juvindiseno` no re-hace benchmark** | `D:\MV\botmef\src\components/` |
| Trabajo de la fábrica | Bloque 1 en cola, 5 mini-bloques, sin arrancar | `cola-trabajo.md` |
| Ficha de registro | `D:\JuvinFactory\registro\botmef-saas.md` | — |

## Stack y puertos

Monorepo npm workspaces. `apps/api` **NestJS 11 + Prisma 7.5 + PostgreSQL 16** ·
`apps/web` **React 19 + Vite 6 + Tailwind 4** · `packages/types`. Redis + BullMQ desde el bloque 2.

Estructura heredada de `D:\MV\invexis\apps\api` (auth JWT, tests, CI, Docker) — **dominio ITAM
descartado**, schema propio. Ver ADR-001.

| Servicio | Puerto |
|---|---|
| API | 3011 |
| Web | 3012 |
| PostgreSQL | 5438 |
| Redis | 6380 |

Verificados libres el 2026-08-13: 3010, 5436 y 5437 ya estaban ocupados por otros proyectos del
catálogo.

## Lo que define este producto

**El aislamiento entre tenants es el criterio de vida o muerte.** Doble barrera: guard + extensión
de Prisma (aplicación) y Row Level Security (base), con el tenant fijado por transacción para no
contaminar el pool de conexiones. Ver ADR-002.

El diferenciador comercial no es el inbox —eso lo tienen todos los competidores— sino el
**cumplimiento**: prueba de opt-in exportable, enmascarado de PII, trazabilidad de qué respondió la
IA y por qué.

## Restricciones que no se negocian

- **Transporte: exclusivamente Meta Cloud API.** Baileys no entra nunca — es cliente no oficial,
  viola los ToS de WhatsApp y ningún cliente empresarial firma un contrato sobre eso.
- **`tenant_id` en cada tabla desde la primera migración.** Agregarlo después obliga a reescribir
  todas las consultas del sistema.
- No se migran `mockData.ts` ni los endpoints de fachada.
- **El "LlamaFirewall" se renombra a "Filtro de contenido"** (decisión del usuario, 2026-08-13).
  En botmef es una lista de 10 frases literales presentada como si fuera un modelo; venderlo como
  detección con mDeBERTa/PromptGuard sin que exista es un problema si un cliente audita. Se llama
  por lo que es. Aplica al **bloque 4**, cuando se porte la UI heredada — si alguna vez se
  implementa detección real con modelo, ahí se renombra de vuelta y se documenta qué modelo es.
- i18n ES/EN (default ES explícito) y tema claro/oscuro son obligatorios desde el primer commit con
  UI — estándar de fábrica.

## Bloqueos

| Bloqueo | Detalle |
|---|---|
| ~~Repo GitHub no creado~~ | **Resuelto** (verificado 2026-10-13): el repo existe y responde a `git ls-remote`. Queda pendiente pushear los 2 commits locales; lo hace `cerrar-proyecto.ps1` al cerrar el primer bloque |
| **Ficha y respaldo sin hacer** | No hay `mv.json` ni respaldo en Drive. Ámbito esperado: `comercial` (vive en DESKTOP-BH05CUG). Se cierra con `D:\JuvinFactory\scripts\cerrar-proyecto.ps1` al terminar el bloque 1 |
| **Hosting de producción** | El VPS DonWeb de 2024 (1 vCPU / 1 GB) no sirve para este producto. Sin decisión tomada; no bloquea los bloques 1–4 |
| **Sin acceso a Meta Cloud API** | Sin Meta Business verificado ni número dedicado. El bloque 2 se construye contra un simulador de webhooks con firma real; no bloquea los bloques 1–4 |

## Roadmap (8 bloques del prompt de origen)

1. **Esqueleto multi-tenant** ← en cola
2. Webhook de Meta: recepción, firma `X-Hub-Signature-256`, cola, persistencia
3. Envío: mensajes de sesión, plantillas, ventana de 24 h, estados de entrega
4. Inbox real: conectar la UI heredada; aquí se parte `SharedInbox.tsx` (166 KB)
5. Onboarding self-service: Embedded Signup, alta de tenant, invitación de agentes
6. IA: respuestas asistidas + RAG sobre la KB del tenant (aquí entra `pgvector`)
7. Facturación: planes, medición de consumo, límites, pasarela de pago
8. Panel de administración de la plataforma

Los bloques 1–4 son el producto mínimo demostrable; 5–8 lo vuelven un negocio.
