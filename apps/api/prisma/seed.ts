// Seed con dos tenants de prueba (insumo de los tests de aislamiento de MB5). Idempotente.
// Corre con el rol propietario (MIGRATION_DATABASE_URL).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const connectionString =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('MIGRATION_DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TENANTS = [
  { id: '00000000-0000-4000-8000-0000000000a1', nombre: 'Tenant Alfa', slug: 'alfa' },
  { id: '00000000-0000-4000-8000-0000000000b2', nombre: 'Tenant Beta', slug: 'beta' },
];

async function main() {
  const passwordHash = await bcrypt.hash('Cambiar123!', 10);
  for (const t of TENANTS) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: {},
      create: { id: t.id, nombre: t.nombre },
    });
    // Mismo email y mismo teléfono en ambos tenants: la unicidad es compuesta.
    await prisma.usuario.upsert({
      where: { tenantId_email: { tenantId: t.id, email: 'owner@test.local' } },
      update: {},
      create: {
        tenantId: t.id,
        email: 'owner@test.local',
        nombre: `Owner ${t.slug}`,
        rol: 'owner',
        passwordHash,
      },
    });
    const contacto = await prisma.contacto.upsert({
      where: { tenantId_telefono: { tenantId: t.id, telefono: '+10000000001' } },
      update: {},
      create: {
        tenantId: t.id,
        telefono: '+10000000001',
        nombre: `Cliente ${t.slug}`,
      },
    });
    const numero = await prisma.numeroWhatsapp.upsert({
      where: {
        tenantId_phoneNumberId: { tenantId: t.id, phoneNumberId: `pn-${t.slug}` },
      },
      update: {},
      create: {
        tenantId: t.id,
        phoneNumberId: `pn-${t.slug}`,
        wabaId: `waba-${t.slug}`,
        displayNumber: '+10000000000',
        tokenCifrado: 'seed-no-es-un-token-real',
      },
    });
    const conv = await prisma.conversacion.upsert({
      where: {
        tenantId_numeroId_contactoId: {
          tenantId: t.id,
          numeroId: numero.id,
          contactoId: contacto.id,
        },
      },
      update: {},
      create: { tenantId: t.id, numeroId: numero.id, contactoId: contacto.id },
    });
    await prisma.mensaje.upsert({
      where: { tenantId_wamid: { tenantId: t.id, wamid: 'wamid.SEED1' } },
      update: {},
      create: {
        tenantId: t.id,
        conversacionId: conv.id,
        direccion: 'entrante',
        wamid: 'wamid.SEED1',
        texto: `Hola ${t.slug}`,
      },
    });
  }
  console.log(`seed: ${TENANTS.length} tenants`);
}

main().finally(() => prisma.$disconnect());
