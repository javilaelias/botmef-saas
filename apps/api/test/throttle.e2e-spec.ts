process.env.THROTTLE_ENABLED = 'true';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Throttler en /auth/login (e2e, C5)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });
  afterAll(() => app.close());

  it('el sexto intento en un minuto recibe 429', async () => {
    const body = {
      tenantId: '00000000-0000-4000-8000-0000000000a1',
      email: 'owner@test.local',
      password: 'incorrecta',
    };
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      codes.push(
        (
          await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send(body)
        ).status,
      );
    }
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes[5]).toBe(429);
  });
});
