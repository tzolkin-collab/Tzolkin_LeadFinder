import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedDictionary() {
  console.log('--- Populando Dicionário de Taxonomia (PT-BR) ---');

  const terms = [
    {
      domain: 'GOOGLE_PLACES_CATEGORY',
      handler: 'autoparts_store',
      translations: { "pt-BR": "Loja de Autopeças", "es-ES": "Tienda de Repuestos" }
    },
    {
      domain: 'GOOGLE_PLACES_CATEGORY',
      handler: 'dentist',
      translations: { "pt-BR": "Dentista / Clínica Odontológica" }
    },
    {
      domain: 'TECHNOLOGY',
      handler: 'facebook_pixel',
      translations: { "pt-BR": "Pixel do Meta" }
    },
    {
      domain: 'TECHNOLOGY',
      handler: 'rd_station',
      translations: { "pt-BR": "RD Station" }
    },
    {
      domain: 'SIGNAL_TYPE',
      handler: 'started_ads',
      translations: { "pt-BR": "Começou a anunciar" }
    }
  ];

  for (const term of terms) {
    await prisma.taxonomyDictionary.upsert({
      where: {
        domain_handler: {
          domain: term.domain,
          handler: term.handler
        }
      },
      update: {
        translations: term.translations
      },
      create: {
        domain: term.domain,
        handler: term.handler,
        translations: term.translations
      }
    });
    console.log(`[Seed] Inserido/Atualizado: ${term.domain} -> ${term.handler}`);
  }

  console.log('--- Dicionário Populado com Sucesso ---');
}

seedDictionary()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
