import { Prisma, PrismaClient } from '@prisma/client';

export type TenantTx = Prisma.TransactionClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fija app.tenant_id con alcance de transacción (set_config(..., true)): al terminar, la
// conexión vuelve al pool sin tenant. Parametrizado, nunca por interpolación (C3).
export function runInTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error('runInTenantContext: tenantId inválido');
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
