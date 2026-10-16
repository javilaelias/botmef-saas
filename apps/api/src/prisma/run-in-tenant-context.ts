import { Prisma } from '@prisma/client';

import { UUID_RE } from '../common/tenant/uuid';

export type TenantTx = Prisma.TransactionClient;

// Acepta el cliente base o el extendido con la barrera 1 (sus tipos de $transaction difieren).
type TxRunner = {
  $transaction<R>(fn: (tx: any) => Promise<R>): Promise<R>;
};

// Fija app.tenant_id con alcance de transacción (set_config(..., true)): al terminar, la
// conexión vuelve al pool sin tenant. Parametrizado, nunca por interpolación (C3).
export function runInTenantContext<T>(
  prisma: TxRunner,
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error('runInTenantContext: tenantId inválido');
  }
  return prisma.$transaction(async (tx: TenantTx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
