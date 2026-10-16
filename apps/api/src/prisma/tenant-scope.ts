import { PrismaClient } from '@prisma/client';
import { currentTenant } from '../common/tenant/tenant-context';

// BARRERA 1 (ADR-002): inyecta tenantId en where/data de cada consulta de modelo desde el contexto
// de la petición, de modo que ningún service escribe tenantId a mano. Falla cerrado: sin contexto
// de tenant o con una operación que no conoce, lanza error en lugar de consultar sin filtro.
//
// LÍMITE CONOCIDO (C3): $queryRaw / $executeRaw NO pasan por esta extensión. Ahí solo protege la
// barrera 2 (RLS). Todo SQL crudo debe ir parametrizado y dentro de runInTenantContext.
// Tampoco cubre create con relación anidada (`tenant: { connect }`): usar la forma con escalares.

const SIN_TENANT = new Set(['Tenant']);

const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

function rechazaAjeno(data: any, tenantId: string) {
  if (data?.tenantId !== undefined && data.tenantId !== tenantId) {
    throw new Error('tenantId ajeno en data: rechazado por la barrera 1');
  }
}

function conTenant(data: any, tenantId: string): any {
  rechazaAjeno(data, tenantId);
  return { ...data, tenantId };
}

export function scopeArgs(operation: string, args: any, tenantId: string): any {
  const a = { ...(args ?? {}) };
  if (WHERE_OPS.has(operation)) {
    a.where = { ...a.where, tenantId };
    rechazaAjeno(a.data, tenantId);
    return a;
  }
  switch (operation) {
    case 'create':
      a.data = conTenant(a.data, tenantId);
      return a;
    case 'createMany':
    case 'createManyAndReturn':
      a.data = Array.isArray(a.data)
        ? a.data.map((d: any) => conTenant(d, tenantId))
        : conTenant(a.data, tenantId);
      return a;
    case 'upsert':
      a.where = { ...a.where, tenantId };
      a.create = conTenant(a.create, tenantId);
      rechazaAjeno(a.update, tenantId);
      return a;
    default:
      throw new Error(`Operación ${operation} no soportada por la barrera 1`);
  }
}

// Los create de los services omiten tenantId (lo pone la barrera 1); el tipo de Prisma lo exige.
export const sinTenant = <T extends { tenantId: string }>(
  data: Omit<T, 'tenantId'>,
): T => data as T;

export function withTenantScope(client: PrismaClient) {
  return client.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (SIN_TENANT.has(model)) return query(args);
          return query(scopeArgs(operation, args, currentTenant().tenantId));
        },
      },
    },
  });
}
