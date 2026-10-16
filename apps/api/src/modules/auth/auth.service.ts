import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Esqueleto heredado de invexis. OJO: el email solo es único por tenant; la resolución de tenant
  // en el login (y RLS) llega en MB3/MB4 — no exponer este endpoint con más de un tenant antes.
  async login(email: string, password: string) {
    const user = await this.prisma.usuario.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.activo || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date() },
    });

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
