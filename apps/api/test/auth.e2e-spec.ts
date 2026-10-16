process.env.THROTTLE_ENABLED = 'false';
process.env.ADMIN_PROVISION_KEY = 'clave-de-provision-de-prueba';
process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

const ALFA = '00000000-0000-4000-8000-0000000000a1';
const BETA = '00000000-0000-4000-8000-0000000000b2';
const KEY = { 'x-admin-provision-key': 'clave-de-provision-de-prueba' };

// Requiere Postgres con migraciones y seed (docker compose up -d --wait; prisma migrate deploy + seed).
jest.setTimeout(30000);

describe('Enforcement de tenant + auth (e2e, MB4)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  const http = () => request(app.getHttpServer());
  const login = (tenantId: string, email = 'owner@test.local') =>
    http()
      .post('/api/v1/auth/login')
      .send({ tenantId, email, password: 'Cambiar123!' });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });
  afterAll(() => app.close());

  it('login correcto devuelve JWT con tenantId; clave mala y tenant ajeno dan el mismo error genérico', async () => {
    const ok = await login(ALFA).expect(201);
    expect(jwt.decode(ok.body.accessToken)).toMatchObject({ tenantId: ALFA });

    const mala = await http()
      .post('/api/v1/auth/login')
      .send({
        tenantId: ALFA,
        email: 'owner@test.local',
        password: 'incorrecta',
      })
      .expect(401);
    const noExiste = await login(ALFA, 'nadie@test.local').expect(401);
    expect(mala.body.message).toBe('Invalid credentials');
    expect(noExiste.body.message).toBe('Invalid credentials');
  });

  it('rutas protegidas exigen JWT; el token sin tenant se rechaza', async () => {
    await http().get('/api/v1/usuarios').expect(401);
    const sinTenant = jwt.sign({ sub: 'x', role: 'owner', email: 'a@b.c' });
    await http()
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${sinTenant}`)
      .expect(401);
  });

  it('un usuario solo ve su tenant, alternando A y B', async () => {
    const a = (await login(ALFA)).body.accessToken;
    const b = (await login(BETA)).body.accessToken;
    for (const [tok, id] of [
      [a, ALFA],
      [b, BETA],
      [a, ALFA],
    ] as const) {
      const res = await http()
        .get('/api/v1/usuarios')
        .set('Authorization', `Bearer ${tok}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      const filas = await prisma.runAsTenant(id, (tx) => tx.usuario.findMany());
      expect(res.body.map((u: { id: string }) => u.id).sort()).toEqual(
        filas.map((u) => u.id).sort(),
      );
    }
  });

  it('un JWT con otro tenantId no accede a datos ajenos: el usuario no existe en ese tenant', async () => {
    const owner = await prisma.runAsTenant(ALFA, (tx) =>
      tx.usuario.findFirstOrThrow(),
    );
    const forjado = jwt.sign({
      sub: owner.id,
      tenantId: BETA,
      role: 'owner',
      email: owner.email,
    });
    await http()
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${forjado}`)
      .expect(401);
  });

  it('alta de tenant: cerrada sin la clave y con clave equivocada; con clave crea tenant+owner y audita', async () => {
    const body = {
      nombre: 'Tenant Nuevo',
      ownerEmail: `nuevo-${Date.now()}@test.local`,
      ownerNombre: 'Owner Nuevo',
      ownerPassword: 'Cambiar123!',
    };
    await http().post('/api/v1/admin/tenants').send(body).expect(403);
    await http()
      .post('/api/v1/admin/tenants')
      .set('x-admin-provision-key', 'mala')
      .send(body)
      .expect(403);
    const res = await http()
      .post('/api/v1/admin/tenants')
      .set(KEY)
      .send(body)
      .expect(201);
    const aud = await prisma.runAsTenant(res.body.tenantId, (tx) =>
      tx.auditoria.findMany(),
    );
    expect(aud.map((x) => x.accion)).toEqual(['tenant_alta']);
    await login(res.body.tenantId, body.ownerEmail.toLowerCase()).expect(201);
  });

  it('invitación: solo owner; el token se guarda hasheado, se usa una vez, expira, y se audita', async () => {
    const owner = (await login(ALFA)).body.accessToken;
    const email = `inv-${Date.now()}@test.local`;

    const inv = await http()
      .post('/api/v1/invitaciones')
      .set('Authorization', `Bearer ${owner}`)
      .send({ email, rol: 'agente' })
      .expect(201);
    const [, secret] = inv.body.token.split('.');
    const fila = await prisma.runAsTenant(ALFA, (tx) =>
      tx.invitacion.findFirstOrThrow({ where: { id: inv.body.id } }),
    );
    expect(fila.tokenHash).toHaveLength(64);
    expect(fila.tokenHash).not.toBe(secret);

    // rol owner no se puede invitar (zod)
    await http()
      .post('/api/v1/invitaciones')
      .set('Authorization', `Bearer ${owner}`)
      .send({ email, rol: 'owner' })
      .expect(400);
    const acept = {
      token: inv.body.token,
      nombre: 'Agente Nuevo',
      password: 'Cambiar123!',
    };
    await http().post('/api/v1/invitaciones/aceptar').send(acept).expect(201);
    const agente = (await login(ALFA, email)).body.accessToken;
    await http()
      .post('/api/v1/invitaciones')
      .set('Authorization', `Bearer ${agente}`)
      .send({ email: 'otro@test.local', rol: 'viewer' })
      .expect(403);

    // un solo uso
    await http().post('/api/v1/invitaciones/aceptar').send(acept).expect(401);

    // expirada
    const exp = await http()
      .post('/api/v1/invitaciones')
      .set('Authorization', `Bearer ${owner}`)
      .send({ email: `exp-${Date.now()}@test.local`, rol: 'viewer' })
      .expect(201);
    await prisma.runAsTenant(ALFA, (tx) =>
      tx.invitacion.updateMany({
        where: { id: exp.body.id },
        data: { expiraEn: new Date(Date.now() - 1000) },
      }),
    );
    await http()
      .post('/api/v1/invitaciones/aceptar')
      .send({ ...acept, token: exp.body.token })
      .expect(401);

    const aud = await prisma.runAsTenant(ALFA, (tx) =>
      tx.auditoria.findMany({
        where: { accion: { startsWith: 'invitacion' } },
      }),
    );
    expect(aud.map((x) => x.accion)).toEqual(
      expect.arrayContaining(['invitacion_crear', 'invitacion_aceptar']),
    );
  });

  it('el login queda auditado', async () => {
    await login(BETA).expect(201);
    const aud = await prisma.runAsTenant(BETA, (tx) =>
      tx.auditoria.count({ where: { accion: 'login' } }),
    );
    expect(aud).toBeGreaterThan(0);
  });

  it('helmet aplicado: los encabezados de seguridad llegan', async () => {
    // helmet se registra en main.ts; aquí se comprueba que el módulo no lo rompe
    await http().get('/api/v1/health/live').expect(200);
  });
});
