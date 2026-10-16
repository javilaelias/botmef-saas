import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

function parseKey(b64: string | undefined, label: string): Buffer {
  const key = Buffer.from(b64 ?? '', 'base64');
  if (key.length !== 32) {
    throw new Error(`${label} debe ser una clave de 32 bytes en base64`);
  }
  return key;
}

// AES-256-GCM (C5). La versión de clave viaja junto al cifrado (numeros_whatsapp.token_key_version)
// para poder rotar: se cifra siempre con la vigente y se descifra con la que indique la fila.
export class TokenCipher {
  constructor(
    private readonly keyFor: (version: number) => Buffer,
    readonly currentVersion: number,
  ) {}

  encrypt(plain: string): { cifrado: string; keyVersion: number } {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.keyFor(this.currentVersion),
      iv,
    );
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const cifrado = Buffer.concat([iv, cipher.getAuthTag(), ct]).toString(
      'base64',
    );
    return { cifrado, keyVersion: this.currentVersion };
  }

  decrypt(cifrado: string, keyVersion: number): string {
    const raw = Buffer.from(cifrado, 'base64');
    if (raw.length < IV_LEN + TAG_LEN) throw new Error('Cifrado inválido');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.keyFor(keyVersion),
      raw.subarray(0, IV_LEN),
    );
    decipher.setAuthTag(raw.subarray(IV_LEN, IV_LEN + TAG_LEN));
    return Buffer.concat([
      decipher.update(raw.subarray(IV_LEN + TAG_LEN)),
      decipher.final(),
    ]).toString('utf8');
  }
}

// Clave vigente: TOKEN_ENCRYPTION_KEY (versión TOKEN_KEY_VERSION). Claves anteriores, para seguir
// descifrando filas viejas durante una rotación: TOKEN_ENCRYPTION_KEY_V<n>.
export function tokenCipherFromEnv(
  get: (name: string) => string | undefined,
): TokenCipher {
  const current = Number(get('TOKEN_KEY_VERSION') ?? 1);
  return new TokenCipher((version) => {
    if (version === current) {
      return parseKey(get('TOKEN_ENCRYPTION_KEY'), 'TOKEN_ENCRYPTION_KEY');
    }
    const name = `TOKEN_ENCRYPTION_KEY_V${version}`;
    return parseKey(get(name), name);
  }, current);
}

// Se construye al primer uso: una clave de ejemplo no impide arrancar la API en desarrollo.
@Injectable()
export class TokenCipherService {
  private cipher?: TokenCipher;

  constructor(private readonly config: ConfigService) {}

  private get(): TokenCipher {
    this.cipher ??= tokenCipherFromEnv((n) => this.config.get<string>(n));
    return this.cipher;
  }

  encrypt(plain: string) {
    return this.get().encrypt(plain);
  }

  decrypt(cifrado: string, keyVersion: number) {
    return this.get().decrypt(cifrado, keyVersion);
  }
}
