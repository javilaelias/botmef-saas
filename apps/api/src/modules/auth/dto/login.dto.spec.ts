import { loginSchema } from './login.dto';

describe('loginSchema (zod)', () => {
  it('acepta credenciales válidas', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: 'abcd1234' }).success,
    ).toBe(true);
  });

  it('rechaza email inválido y password corta', () => {
    expect(
      loginSchema.safeParse({ email: 'x', password: 'abcd' }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: 'a@b.co', password: 'abc' }).success,
    ).toBe(false);
  });
});
