// Suite de aislamiento (MB5, C9). Requiere Postgres con migraciones y seed (docker compose up -d --wait db).
// Corre por test/jest-e2e.json: el Jest de src/ (*.spec.ts) no la recoge.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { tenantStorage } from './../src/common/tenant/tenant-context';
import { runInTenantContext } from './../src/prisma/run-in-tenant-context';
import { withTenantScope } from './../src/prisma/tenant-scope';

const ALFA = '00000000-0000-4000-8000-0000000000a1';
const BETA = '00000000-0000-4000-8000-0000000000b2';
const PERIODO = '2099-01';

jest.setTimeout(30000);

const cliente = (url?: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

describe('Aislamiento multi-tenant (e2e, MB5)', () => {
  let app: PrismaClient; // rol de aplicación: sin BYPASSRLS
  let owner: PrismaClient; // superusuario: RLS no le aplica (solo para sembrar y para probar la barrera 1 sola)

  beforeAll(async () => {
    app = cliente(process.env.DATABASE_URL);
    owner = cliente(process.env.MIGRATION_DATABASE_URL);
    for (const [tenantId, costo] of [
      [ALFA, 1],
      [BETA, 2],
    ] as const) {
      await owner.consumo.upsert({
        where: { tenantId_periodo: { tenantId, periodo: PERIODO } },
        update: { costo },
        create: { tenantId, periodo: PERIODO, costo },
      });
    }
  });
  afterAll(async () => {
    await owner.consumo.deleteMany({ where: { periodo: PERIODO } });
    await owner.contacto.deleteMany({
      where: { telefono: { startsWith: '+999mb5' } },
    });
    await app.$disconnect();
    await owner.$disconnect();
  });

  const veTodo = (id: string) =>
    runInTenantContext(app, id, async (tx) => ({
      conversaciones: await tx.conversacion.findMany(),
      mensajes: await tx.mensaje.findMany(),
      contactos: await tx.contacto.findMany(),
      metricas: await tx.consumo.findMany(),
    }));

  it('A no ve conversaciones, mensajes, contactos ni métricas de B (y viceversa)', async () => {
    for (const [yo, otro] of [
      [ALFA, BETA],
      [BETA, ALFA],
    ]) {
      const r = await veTodo(yo);
      for (const filas of Object.values(r)) {
        expect(filas.length).toBeGreaterThan(0);
        expect(filas.every((f) => f.tenantId === yo)).toBe(true);
        expect(filas.some((f) => f.tenantId === otro)).toBe(false);
      }
    }
  });

  it('alternar A y B sobre el mismo pool no filtra contexto', async () => {
    const orden = [ALFA, BETA, BETA, ALFA, BETA, ALFA, ALFA, BETA];
    const r = await Promise.all(
      orden.map((id) =>
        runInTenantContext(app, id, (tx) => tx.contacto.findMany()),
      ),
    );
    r.forEach((filas, i) => {
      expect(filas.length).toBeGreaterThan(0);
      expect(filas.every((f) => f.tenantId === orden[i])).toBe(true);
    });
    // Tras las transacciones la conexión vuelve al pool sin tenant.
    expect(await app.contacto.count()).toBe(0);
  });

  it('una query sin filtro de tenant no devuelve filas ajenas', async () => {
    const sinFiltro = await runInTenantContext(app, ALFA, (tx) =>
      tx.contacto.findMany({ where: {} }),
    );
    expect(sinFiltro.length).toBeGreaterThan(0);
    expect(sinFiltro.every((c) => c.tenantId === ALFA)).toBe(true);
    const raw = await runInTenantContext(
      app,
      ALFA,
      (tx) =>
        tx.$queryRaw<{ tenant_id: string }[]>`SELECT tenant_id FROM mensajes`,
    );
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.every((m) => m.tenant_id === ALFA)).toBe(true);
    // Pidiendo explícitamente el id del otro tenant: nada.
    const ajeno = await runInTenantContext(app, ALFA, (tx) =>
      tx.contacto.findMany({ where: { tenantId: BETA } }),
    );
    expect(ajeno).toEqual([]);
  });

  it('la escritura con tenantId ajeno la rechaza el WITH CHECK', async () => {
    await expect(
      runInTenantContext(app, ALFA, (tx) =>
        tx.contacto.create({ data: { tenantId: BETA, telefono: '+999mb5-a' } }),
      ),
    ).rejects.toThrow();
    expect(
      await owner.contacto.count({ where: { telefono: '+999mb5-a' } }),
    ).toBe(0);
  });

  describe('barrera 1 sola (RLS deshabilitado: el superusuario lo ignora)', () => {
    let scoped: ReturnType<typeof withTenantScope>;
    beforeAll(() => {
      scoped = withTenantScope(owner);
    });
    const como = <T>(id: string, fn: () => Promise<T>) =>
      tenantStorage.run({ tenantId: id }, async () => await fn()); // las queries de Prisma son perezosas: se ejecutan dentro del contexto

    it('sin la barrera 1 y sin RLS, el cliente ve ambos tenants (control)', async () => {
      const ids = new Set(
        (await owner.contacto.findMany()).map((c) => c.tenantId),
      );
      expect(ids.has(ALFA) && ids.has(BETA)).toBe(true);
    });

    it('filtra por tenant del contexto aunque la query no lo pida', async () => {
      for (const id of [ALFA, BETA]) {
        const filas = await como(id, () => scoped.contacto.findMany());
        expect(filas.length).toBeGreaterThan(0);
        expect(filas.every((c) => c.tenantId === id)).toBe(true);
        const msgs = await como(id, () => scoped.mensaje.findMany());
        expect(msgs.every((m) => m.tenantId === id)).toBe(true);
      }
    });

    it('pedir el tenant ajeno no lo esquiva, y escribirlo se rechaza', async () => {
      const ajeno = await como(ALFA, () =>
        scoped.contacto.findMany({ where: { tenantId: BETA } }),
      );
      // La barrera 1 pisa el tenantId pedido con el del contexto: nunca hay filas de B.
      expect(ajeno.some((c) => c.tenantId === BETA)).toBe(false);
      await expect(
        como(ALFA, () =>
          scoped.contacto.create({
            data: { tenantId: BETA, telefono: '+999mb5-b' },
          }),
        ),
      ).rejects.toThrow(/barrera 1/);
    });

    it('falla cerrado sin contexto de tenant', async () => {
      await expect(scoped.contacto.findMany()).rejects.toThrow(
        /contexto de tenant/,
      );
    });
  });
});
