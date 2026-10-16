// Requiere Postgres arriba con la migración y el seed aplicados (docker compose up -d --wait).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { runInTenantContext } from './run-in-tenant-context';

const ALFA = '00000000-0000-4000-8000-0000000000a1';
const BETA = '00000000-0000-4000-8000-0000000000b2';

describe('RLS (MB3)', () => {
  let app: PrismaClient;

  beforeAll(() => {
    app = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  });
  afterAll(() => app.$disconnect());

  it('el rol de la aplicación no tiene BYPASSRLS ni es superusuario', async () => {
    const rows = await app.$queryRaw<
      { rolbypassrls: boolean; rolsuper: boolean }[]
    >`SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`;
    expect(rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it('el rol de la aplicación no es dueño de ninguna tabla', async () => {
    const rows = await app.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user`;
    expect(Number(rows[0].n)).toBe(0);
  });

  it('una conexión que no fijó app.tenant_id no lee ninguna fila', async () => {
    expect(await app.usuario.count()).toBe(0);
    expect(await app.contacto.count()).toBe(0);
    expect(
      (
        await app.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM mensajes`
      )[0].n,
    ).toBe(0n);
  });

  it('con tenant fijado solo ve sus filas, y alternar tenants no se contamina', async () => {
    for (const id of [ALFA, BETA, ALFA]) {
      const us = await runInTenantContext(app, id, (tx) =>
        tx.usuario.findMany(),
      );
      expect(us.length).toBeGreaterThan(0);
      expect(us.every((u) => u.tenantId === id)).toBe(true);
    }
    expect(await app.usuario.count()).toBe(0);
  });

  it('WITH CHECK impide escribir filas de otro tenant', async () => {
    await expect(
      runInTenantContext(app, ALFA, (tx) =>
        tx.contacto.create({ data: { tenantId: BETA, telefono: '+000rls' } }),
      ),
    ).rejects.toThrow();
  });

  it('rechaza un tenantId que no es UUID', () => {
    expect(() =>
      runInTenantContext(app, "x'; DROP TABLE usuarios;--", () =>
        Promise.resolve(1),
      ),
    ).toThrow();
  });
});
