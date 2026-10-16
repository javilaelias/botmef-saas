import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Dos URLs (C8): DATABASE_URL es el rol de aplicación (runtime, ver PrismaService);
// MIGRATION_DATABASE_URL es el rol propietario y lo usan solo migrate/seed.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: process.env['MIGRATION_DATABASE_URL'] ?? process.env['DATABASE_URL'],
  },
});
