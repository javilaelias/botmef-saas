import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './config/env';
import { createRequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const config = app.get(ConfigService);
  app.use(
    createRequestLoggerMiddleware({
      enabled: config.get('REQUEST_LOG_ENABLED'),
    }),
  );
  const corsOrigins = parseCorsOrigins(
    String(config.get('CORS_ORIGINS') ?? ''),
  );
  const allowAllOrigins = corsOrigins.includes('*');

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowAllOrigins) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  await app.listen(Number(process.env.PORT ?? 3011));
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
