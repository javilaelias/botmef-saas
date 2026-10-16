import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Requiere Postgres arriba (docker compose up -d --wait) y las variables de .env.example.
describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health/live -> 200', () =>
    request(app.getHttpServer()).get('/api/v1/health/live').expect(200));

  it('POST /api/v1/auth/login con cuerpo inválido -> 400 (zod)', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'no-es-email' })
      .expect(400));
});
