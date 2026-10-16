import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtUserPayload } from '../../modules/auth/jwt.strategy';
import { UUID_RE } from '../tenant/uuid';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Corre después de JwtAuthGuard: extrae tenantId del JWT, rechaza el token sin tenant (el contexto lo abre TenantContextInterceptor). Aunque este guard fallara, RLS (barrera 2) corta el acceso.
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const user = context.switchToHttp().getRequest().user as
      JwtUserPayload | undefined;
    if (!user?.tenantId || !UUID_RE.test(user.tenantId)) {
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }
}
