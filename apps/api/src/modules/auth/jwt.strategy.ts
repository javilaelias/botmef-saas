import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type JwtUserPayload = {
  sub: string; // userId
  tenantId: string;
  role: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtUserPayload) {
    if (!payload?.sub || !payload.tenantId) {
      throw new UnauthorizedException('Unauthorized');
    }
    // El token dura horas: se revalida que el tenant siga activo y el usuario habilitado.
    const vigente = await this.prisma.runAsTenant(
      payload.tenantId,
      async (tx) => {
        const tenant = await tx.tenant.findUnique({
          where: { id: payload.tenantId },
        });
        const user = await tx.usuario.findFirst({ where: { id: payload.sub } });
        return tenant?.estado === 'activo' && user?.activo === true;
      },
    );
    if (!vigente) throw new UnauthorizedException('Unauthorized');
    return payload;
  }
}
