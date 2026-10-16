import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantContext = {
  tenantId: string;
  userId?: string;
  rol?: string;
};

// Contexto de la petición en curso. Lo abre TenantGuard (desde el JWT) o PrismaService.runAsTenant
// (login, alta de tenant, aceptar invitación: flujos sin JWT donde el tenant llega por otra vía).
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function currentTenant(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error('Sin contexto de tenant: la operación no puede ejecutarse');
  }
  return ctx;
}
