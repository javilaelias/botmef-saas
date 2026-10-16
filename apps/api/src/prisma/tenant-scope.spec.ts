import { scopeArgs } from './tenant-scope';

const T = '00000000-0000-4000-8000-0000000000a1';
const OTRO = '00000000-0000-4000-8000-0000000000b2';

describe('barrera 1: scopeArgs', () => {
  it('inyecta tenantId en el where de lecturas, updates y deletes', () => {
    for (const op of [
      'findMany',
      'findFirst',
      'count',
      'updateMany',
      'delete',
    ]) {
      expect(scopeArgs(op, { where: { id: 'x' } }, T).where).toEqual({
        id: 'x',
        tenantId: T,
      });
    }
    expect(scopeArgs('findMany', undefined, T).where).toEqual({ tenantId: T });
  });

  it('un where con tenantId ajeno queda pisado por el del contexto', () => {
    expect(
      scopeArgs('findMany', { where: { tenantId: OTRO } }, T).where,
    ).toEqual({ tenantId: T });
  });

  it('inyecta tenantId en data de create, createMany y upsert', () => {
    expect(scopeArgs('create', { data: { a: 1 } }, T).data).toEqual({
      a: 1,
      tenantId: T,
    });
    expect(
      scopeArgs('createMany', { data: [{ a: 1 }, { a: 2 }] }, T).data,
    ).toEqual([
      { a: 1, tenantId: T },
      { a: 2, tenantId: T },
    ]);
    const up = scopeArgs(
      'upsert',
      { where: { id: 'x' }, create: {}, update: {} },
      T,
    );
    expect(up.where.tenantId).toBe(T);
    expect(up.create.tenantId).toBe(T);
  });

  it('rechaza data con tenantId ajeno (create y update)', () => {
    expect(() =>
      scopeArgs('create', { data: { tenantId: OTRO } }, T),
    ).toThrow();
    expect(() =>
      scopeArgs('update', { where: {}, data: { tenantId: OTRO } }, T),
    ).toThrow();
  });

  it('falla cerrado ante una operación desconocida', () => {
    expect(() => scopeArgs('findRaw', {}, T)).toThrow(/no soportada/);
  });
});
