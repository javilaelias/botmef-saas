import { randomBytes } from 'node:crypto';
import { tokenCipherFromEnv } from './token-cipher';

const k1 = randomBytes(32).toString('base64');
const k2 = randomBytes(32).toString('base64');

const env = (o: Record<string, string>) => (n: string) => o[n];

describe('TokenCipher (AES-256-GCM, C5)', () => {
  it('cifra y descifra, con IV distinto cada vez', () => {
    const c = tokenCipherFromEnv(
      env({ TOKEN_ENCRYPTION_KEY: k1, TOKEN_KEY_VERSION: '1' }),
    );
    const a = c.encrypt('EAAG-token');
    const b = c.encrypt('EAAG-token');
    expect(a.cifrado).not.toBe(b.cifrado);
    expect(a.cifrado).not.toContain('EAAG');
    expect(a.keyVersion).toBe(1);
    expect(c.decrypt(a.cifrado, a.keyVersion)).toBe('EAAG-token');
  });

  it('un cifrado alterado no descifra (autenticación GCM)', () => {
    const c = tokenCipherFromEnv(env({ TOKEN_ENCRYPTION_KEY: k1 }));
    const { cifrado, keyVersion } = c.encrypt('secreto');
    const raw = Buffer.from(cifrado, 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => c.decrypt(raw.toString('base64'), keyVersion)).toThrow();
  });

  it('rotación: cifra con la vigente y sigue leyendo la versión anterior', () => {
    const v1 = tokenCipherFromEnv(
      env({ TOKEN_ENCRYPTION_KEY: k1, TOKEN_KEY_VERSION: '1' }),
    );
    const viejo = v1.encrypt('token-viejo');
    const v2 = tokenCipherFromEnv(
      env({
        TOKEN_ENCRYPTION_KEY: k2,
        TOKEN_KEY_VERSION: '2',
        TOKEN_ENCRYPTION_KEY_V1: k1,
      }),
    );
    expect(v2.encrypt('x').keyVersion).toBe(2);
    expect(v2.decrypt(viejo.cifrado, viejo.keyVersion)).toBe('token-viejo');
  });

  it('rechaza una clave que no es de 32 bytes y una versión sin clave', () => {
    const mala = tokenCipherFromEnv(env({ TOKEN_ENCRYPTION_KEY: 'corta' }));
    expect(() => mala.encrypt('x')).toThrow(/32 bytes/);
    const c = tokenCipherFromEnv(env({ TOKEN_ENCRYPTION_KEY: k1 }));
    const { cifrado } = c.encrypt('x');
    expect(() => c.decrypt(cifrado, 7)).toThrow(/TOKEN_ENCRYPTION_KEY_V7/);
  });
});
