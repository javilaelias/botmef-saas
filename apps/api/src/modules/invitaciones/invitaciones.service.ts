import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { currentTenant } from '../../common/tenant/tenant-context';
import { UUID_RE } from '../../common/tenant/uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { sinTenant } from '../../prisma/tenant-scope';
import { registrarAuditoria } from '../audit/audit';

export const INVITACION_TTL_MS = 72 * 60 * 60 * 1000;

const hashSecret = (secret: string) =>
  createHash('sha256').update(secret).digest('hex');

// Token = "<tenantId>.<secreto>": el tenantId deja abrir el contexto RLS sin JWT; en base solo
// vive el hash del secreto (C5). Un solo uso y con expiración.
@Injectable()
export class InvitacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(email: string, rol: 'agente' | 'viewer') {
    const { tenantId, userId } = currentTenant();
    const secret = randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + INVITACION_TTL_MS);
    const inv = await this.prisma.inTenant(async (tx) => {
      const created = await tx.invitacion.create({
        data: sinTenant<Prisma.InvitacionUncheckedCreateInput>({
          email: email.toLowerCase(),
          rol,
          tokenHash: hashSecret(secret),
          expiraEn,
        }),
      });
      await registrarAuditoria(tx, {
        accion: 'invitacion_crear',
        entidad: 'invitacion',
        entidadId: created.id,
        usuarioId: userId,
      });
      return created;
    });
    // Aún no hay mailer: el token se entrega a quien invita, y solo en esta respuesta.
    return { id: inv.id, token: `${tenantId}.${secret}`, expiraEn };
  }

  async aceptar(token: string, nombre: string, password: string) {
    const [tenantId, secret] = token.split('.');
    if (!UUID_RE.test(tenantId ?? '') || !/^[0-9a-f]{64}$/.test(secret ?? '')) {
      throw new UnauthorizedException('Invalid invitation');
    }
    const tokenHash = hashSecret(secret);

    return this.prisma.runAsTenant(tenantId, async (tx) => {
      // updateMany condicionado: gana una sola petición si llegan dos a la vez.
      const claimed = await tx.invitacion.updateMany({
        where: { tokenHash, usadaEn: null, expiraEn: { gt: new Date() } },
        data: { usadaEn: new Date() },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException('Invalid invitation');
      }
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.estado !== 'activo') {
        throw new UnauthorizedException('Invalid invitation');
      }
      // bcrypt recién tras validar el token: un token falso no cuesta CPU.
      const passwordHash = await bcrypt.hash(password, 10);
      const inv = await tx.invitacion.findFirstOrThrow({
        where: { tokenHash },
      });
      const exists = await tx.usuario.findFirst({
        where: { email: inv.email },
      });
      if (exists) throw new ConflictException('User already exists');
      const user = await tx.usuario.create({
        data: sinTenant<Prisma.UsuarioUncheckedCreateInput>({
          email: inv.email,
          nombre,
          rol: inv.rol,
          passwordHash,
        }),
      });
      await registrarAuditoria(tx, {
        accion: 'invitacion_aceptar',
        entidad: 'invitacion',
        entidadId: inv.id,
        usuarioId: user.id,
      });
      return { userId: user.id, email: user.email, rol: user.rol };
    });
  }
}
