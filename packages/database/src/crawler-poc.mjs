import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mock function to simulate visiting a website and extracting data
async function crawlWebsite(url) {
  console.log(`\n[Crawler] Iniciando varredura em: ${url}`);
  
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock extracted payload
  const payload = {
    url,
    title: "Clínica Exemplo",
    technologies: ["WordPress", "Elementor", "Google Analytics", "Meta Pixel"],
    performance: {
      lcp: 3.5, // Largest Contentful Paint em segundos
      cls: 0.1,
      fcp: 1.2
    },
    socialLinks: {
      instagram: "https://instagram.com/clinicaexemplo",
      whatsapp: null
    },
    scrapedAt: new Date().toISOString()
  };

  // 1. Generate deterministic hash of the payload
  const payloadForHash = { ...payload };
  delete payloadForHash.scrapedAt;

  const payloadString = JSON.stringify(payloadForHash, Object.keys(payloadForHash).sort());
  const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

  console.log(`[Crawler] Extração concluída. Hash gerado: ${payloadHash}`);
  
  return { payload, payloadHash };
}

async function runPoC() {
  console.log('--- Iniciando PoC Crawler ---');
  
  let business = await prisma.canonicalBusiness.findFirst({
    where: { name: "Clínica PoC Test" }
  });
  
  if (!business) {
    business = await prisma.canonicalBusiness.create({
      data: {
        name: "Clínica PoC Test",
        category: "Clínica Médica",
        city: "São Paulo",
      }
    });
    console.log(`[DB] Criada empresa canônica de teste: ${business.id}`);
  } else {
    console.log(`[DB] Usando empresa de teste existente: ${business.id}`);
  }

  // CRAWL 1
  console.log('\n--- CRAWL 1: Primeira visita ---');
  const { payload: p1, payloadHash: h1 } = await crawlWebsite('https://clinicaexemplo.com.br');
  
  try {
    const obs1 = await prisma.observation.create({
      data: {
        canonicalId: business.id,
        source: 'WEBSITE_PROBE',
        payload: p1,
        payloadHash: h1
      }
    });
    console.log(`[DB] Sucesso! Primeira Observação salva (ID: ${obs1.id})`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log(`[DB] Observação inicial já existe no banco. Tudo bem.`);
    } else {
      console.log(`[DB] Erro: ${error.message}`);
    }
  }

  // CRAWL 2
  console.log('\n--- CRAWL 2: Segunda visita (Nenhuma alteração no site) ---');
  const { payload: p2, payloadHash: h2 } = await crawlWebsite('https://clinicaexemplo.com.br');
  
  try {
    const obs2 = await prisma.observation.create({
      data: {
        canonicalId: business.id,
        source: 'WEBSITE_PROBE',
        payload: p2,
        payloadHash: h2
      }
    });
    console.log(`[DB] Erro Inesperado: Conseguiu salvar duplicação (ID: ${obs2.id})`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log(`[DB] Sucesso! Prisma bloqueou a duplicação graças à Unique Constraint no payloadHash (${h2}). Custo zero.`);
    } else {
      console.log(`[DB] Erro inesperado: ${error.message}`);
    }
  }

  // CRAWL 3
  console.log('\n--- CRAWL 3: Terceira visita (Site atualizado com nova tecnologia) ---');
  const { payload: p3, payloadHash: h3 } = await crawlWebsite('https://clinicaexemplo.com.br');
  
  // Modifying the payload to simulate an update
  p3.technologies.push("RD Station");
  const p3ForHash = { ...p3 };
  delete p3ForHash.scrapedAt;
  const payloadString3 = JSON.stringify(p3ForHash, Object.keys(p3ForHash).sort());
  const h3Real = crypto.createHash('sha256').update(payloadString3).digest('hex');
  
  try {
    const obs3 = await prisma.observation.create({
      data: {
        canonicalId: business.id,
        source: 'WEBSITE_PROBE',
        payload: p3,
        payloadHash: h3Real
      }
    });
    console.log(`[DB] Sucesso! Nova Observação salva devido à mudança de Hash (ID: ${obs3.id})`);
    console.log(`[Engine] A partir desta observação, o motor Assíncrono geraria um Signal: "Começou a usar RD Station"`);
  } catch (error) {
    if (error.code === 'P2002') {
       console.log(`[DB] O teste CRAWL 3 já foi rodado antes, a tecnologia já está lá. Tudo certo.`);
    } else {
       console.log(`[DB] Erro ao salvar terceira observação: ${error.message}`);
    }
  }

  // --- CRAWL 3 OMITTED IN THIS DIFF FOR BREVITY (ALREADY EXISTS) ---
  
  // ==========================================
  // DEMO 4: Tradução de Handlers (Taxonomy Dictionary)
  // ==========================================
  console.log('\n--- DEMO 4: Tradução de Handlers (Taxonomy Dictionary) ---');
  console.log('[Engine] O bot extraiu as tags cruas em inglês (ex: facebook_pixel, autoparts_store).');
  
  const rawTagsFromBot = ['facebook_pixel', 'autoparts_store', 'unknown_tag'];
  console.log(`[Engine] Handlers brutos coletados:`, rawTagsFromBot);

  // Simulando o Frontend ou API consumindo as traduções
  for (const handler of rawTagsFromBot) {
    const dictionaryEntry = await prisma.taxonomyDictionary.findFirst({
      where: { handler }
    });

    if (dictionaryEntry && dictionaryEntry.translations) {
      const ptBr = dictionaryEntry.translations["pt-BR"];
      console.log(`✅ Traduzido com sucesso: '${handler}' -> '${ptBr}' (O Frontend exibe isso)`);
    } else {
      console.log(`⚠️ Handler não encontrado: '${handler}' -> O Worker de IA será chamado assincronamente para traduzir e salvar.`);
    }
  }

  console.log('\n--- PoC Crawler Concluído ---');
}

runPoC()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
