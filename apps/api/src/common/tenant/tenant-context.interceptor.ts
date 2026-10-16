import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { JwtUserPayload } from '../../modules/auth/jwt.strategy';
import { tenantStorage } from './tenant-context';

// Abre el AsyncLocalStorage alrededor del handler. TenantGuard ya validó el tenantId; esto no
// puede hacerse en el guard porque un enterWith ahí no llega al handler (Nest lo invoca fuera).
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest().user as
      JwtUserPayload | undefined;
    if (!user?.tenantId) return next.handle();
    return new Observable((subscriber) =>
      tenantStorage.run(
        { tenantId: user.tenantId, userId: user.sub, rol: user.role },
        () => next.handle().subscribe(subscriber),
      ),
    );
  }
}
