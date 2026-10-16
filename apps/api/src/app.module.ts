import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CryptoModule } from './common/crypto/crypto.module';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { TenantContextInterceptor } from './common/tenant/tenant-context.interceptor';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { InvitacionesModule } from './modules/invitaciones/invitaciones.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { HealthModule } from './modules/health/health.module';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            // ttl de @nestjs/throttler v6 está en milisegundos.
            ttl: Number(config.get('THROTTLE_TTL_SEC') ?? 60) * 1000,
            limit: Number(config.get('THROTTLE_LIMIT') ?? 300),
          },
        ],
        skipIf: () => config.get('THROTTLE_ENABLED') === false,
      }),
    }),
    PrismaModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    AdminModule,
    InvitacionesModule,
    UsuariosModule,
  ],
  // El orden importa: throttle → JWT → tenant (valida) → roles; el interceptor abre el contexto.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
