import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../prisma/prisma.service';
import { sinTenant } from '../../prisma/tenant-scope';
import { registrarAuditoria } from '../audit/audit';
import { AdminKeyGuard } from './admin-key.guard';

const altaTenantSchema = z.object({
  nombre: z.string().min(2).max(140),
  ownerEmail: z.string().email(),
  ownerNombre: z.string().min(2).max(140),
  ownerPassword: z.string().min(8).max(200),
});
type AltaTenantDto = z.infer<typeof altaTenantSchema>;

@Controller('admin/tenants')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @UseGuards(AdminKeyGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  async alta(
    @Body(new ZodValidationPipe(altaTenantSchema)) dto: AltaTenantDto,
  ) {
    const tenantId = randomUUID();
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
    return this.prisma.runAsTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, nombre: dto.nombre } });
      const owner = await tx.usuario.create({
        data: sinTenant<Prisma.UsuarioUncheckedCreateInput>({
          email: dto.ownerEmail.toLowerCase(),
          nombre: dto.ownerNombre,
          rol: 'owner',
          passwordHash,
        }),
      });
      await registrarAuditoria(tx, {
        accion: 'tenant_alta',
        entidad: 'tenant',
        entidadId: tenantId,
      });
      return { tenantId, ownerId: owner.id };
    });
  }
}
