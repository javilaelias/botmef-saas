import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { currentTenant, tenantStorage } from '../common/tenant/tenant-context';
import { runInTenantContext, TenantTx } from './run-in-tenant-context';
import { withTenantScope } from './tenant-scope';

// Runtime con DATABASE_URL (rol de aplicación, sin BYPASSRLS). Las migraciones usan
// MIGRATION_DATABASE_URL vía prisma.config.ts.
//
// Los services de negocio NO usan este cliente directamente (sin filtro de tenant): usan
// `inTenant(fn)` (tenant del JWT) o `runAsTenant(id, fn)` (flujos sin JWT). Ambos corren en una
// transacción con RLS fijado (barrera 2) sobre el cliente con la barrera 1 aplicada.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly scoped = withTenantScope(this);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Tenant de la petición (lo abrió TenantGuard).
  inTenant<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return runInTenantContext(this.scoped, currentTenant().tenantId, fn);
  }

  // Flujos sin JWT (login, alta de tenant, aceptar invitación): el tenant llega explícito.
  runAsTenant<T>(
    tenantId: string,
    fn: (tx: TenantTx) => Promise<T>,
    ctx: { userId?: string; rol?: string } = {},
  ): Promise<T> {
    return tenantStorage.run({ tenantId, ...ctx }, () =>
      runInTenantContext(this.scoped, tenantId, fn),
    );
  }
}
