import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { registrarAuditoria } from '../audit/audit';

// Hash de relleno: el tiempo de respuesta no distingue "usuario inexistente" de "clave mala".
const DUMMY_HASH = bcrypt.hashSync('relleno-timing', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(tenantId: string, email: string, password: string) {
    const found = await this.prisma.runAsTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      const user = await tx.usuario.findFirst({
        where: { email: email.toLowerCase() },
      });
      return tenant?.estado === 'activo' ? user : null;
    });

    const ok = await bcrypt.compare(
      password,
      found?.passwordHash ?? DUMMY_HASH,
    );
    if (!found || !found.activo || !found.passwordHash || !ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = found;

    await this.prisma.runAsTenant(
      tenantId,
      async (tx) => {
        await tx.usuario.update({
          where: { id: user.id },
          data: { ultimoLogin: new Date() },
        });
        await registrarAuditoria(tx, {
          accion: 'login',
          entidad: 'usuario',
          entidadId: user.id,
          usuarioId: user.id,
        });
      },
      { userId: user.id, rol: user.rol },
    );

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.rol,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    };
  }
}
