import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

const sha = (s: string) => createHash('sha256').update(s).digest();

// C6: el alta de tenant está cerrada. Sin ADMIN_PROVISION_KEY configurada, queda cerrada del todo.
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_PROVISION_KEY');
    const sent = context.switchToHttp().getRequest().headers[
      'x-admin-provision-key'
    ];
    if (
      !expected ||
      typeof sent !== 'string' ||
      !timingSafeEqual(sha(sent), sha(expected))
    ) {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
