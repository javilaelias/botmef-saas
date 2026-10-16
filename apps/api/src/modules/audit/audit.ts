import { Prisma } from '@prisma/client';
import { sinTenant } from '../../prisma/tenant-scope';
import type { TenantTx } from '../../prisma/run-in-tenant-context';

// C10: cada escritura va en la misma transacción que el hecho auditado.
export type AuditEntry = {
  accion: 'tenant_alta' | 'login' | 'invitacion_crear' | 'invitacion_aceptar';
  entidad: string;
  entidadId?: string;
  usuarioId?: string;
};

export function registrarAuditoria(tx: TenantTx, e: AuditEntry) {
  return tx.auditoria.create({
    data: sinTenant<Prisma.AuditoriaUncheckedCreateInput>({
      accion: e.accion,
      entidad: e.entidad,
      entidadId: e.entidadId,
      usuarioId: e.usuarioId,
    }),
  });
}
