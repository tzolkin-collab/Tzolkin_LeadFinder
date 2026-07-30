import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// ASSINATURAS DE TECNOLOGIAS (REGEX DICTIONARY)
// ==========================================
const TECH_SIGNATURES = [
  { handler: 'wordpress', pattern: /wp-content|meta name=["']generator["'] content=["']WordPress/i },
  { handler: 'facebook_pixel', pattern: /connect\.facebook\.net|fbevents\.js/i },
  { handler: 'google_analytics', pattern: /googletagmanager\.com\/gtag\/js|google-analytics\.com\/analytics\.js/i },
  { handler: 'rd_station', pattern: /rdstation\.com\/js/i },
  { handler: 'vtex', pattern: /vtexassets|vteximg/i },
  { handler: 'nuvemshop', pattern: /tiendanube|nuvemshop/i },
  { handler: 'elementor', pattern: /elementor-frontend/i },
  { handler: 'cloudflare', pattern: /cloudflare\.com|cdn-cgi/i },
  { handler: 'react', pattern: /__REACT_DEVTOOLS_GLOBAL_HOOK__|data-reactroot/i },
  { handler: 'nextjs', pattern: /__NEXT_DATA__|_next\/static/i },
];

/**
 * Faz o web probe (scrape) no site e retorna as tecnologias encontradas
 */
async function probeWebsite(url) {
  console.log(`[Web Probe] Analisando código-fonte de: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TzolkinProbe/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP Erro: ${response.status}`);
    }

    const html = await response.text();
    console.log(`[Web Probe] HTML baixado (${html.length} bytes). Passando pelo motor de regex...`);

    const detected = [];

    for (const tech of TECH_SIGNATURES) {
      if (tech.pattern.test(html)) {
        detected.push(tech.handler);
      }
    }

    return detected;

  } catch (error) {
    console.error(`[Web Probe] Falha ao analisar ${url}:`, error.message);
    return [];
  }
}

async function run() {
  console.log('--- Iniciando Tzolkin Web Probe (Scraper de Tecnologias) ---\n');

  // Testando com um site comum que deve ter Next.js, Cloudflare, etc.
  const targetUrl = 'https://lessie.ai';
  
  // 1. Extração
  const foundTags = await probeWebsite(targetUrl);
  console.log(`\n[Web Probe] Tecnologias detectadas no site bruto:`, foundTags);

  if (foundTags.length === 0) {
     console.log('Nenhuma tecnologia mapeada foi encontrada.');
     return;
  }

  // 2. Simulando o Prisma e a Camada de Tradução
  console.log('\n[Database] Processando e traduzindo handlers detectados...');
  const translated = [];

  for (const handler of foundTags) {
    const dictionaryEntry = await prisma.taxonomyDictionary.findFirst({
      where: { handler }
    });

    if (dictionaryEntry && dictionaryEntry.translations) {
      translated.push(dictionaryEntry.translations["pt-BR"]);
    } else {
      // Falback se não achar tradução
      translated.push(handler);
    }
  }

  console.log(`[UI] A interface de Busca exibirá:`, translated);

  // 3. Gerando Hash e gravando na Master Table
  const payload = { url: targetUrl, technologies: foundTags };
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  console.log(`\n[Database] Hash do payload: ${payloadHash}`);
  
  // Pegando a empresa dummy do PoC anterior para gravar
  const dummyBusiness = await prisma.canonicalBusiness.findFirst();
  if (dummyBusiness) {
      try {
          const obs = await prisma.observation.create({
              data: {
                  canonicalId: dummyBusiness.id,
                  source: 'WEBSITE_PROBE',
                  payload,
                  payloadHash
              }
          });
          console.log(`[Database] Sucesso! Nova observação de tecnologia gravada (ID: ${obs.id})`);
      } catch (e) {
          if (e.code === 'P2002') {
             console.log(`[Database] Sucesso! Deduplicação atuou perfeitamente. Estas tecnologias já haviam sido registradas para este CNPJ (Unique Constraint no Hash).`);
          } else {
             console.error(e);
          }
      }
  }

  console.log('\n--- Web Probe Finalizado ---');
}

run().catch(console.error).finally(() => {
    prisma.$disconnect();
    pool.end();
});
