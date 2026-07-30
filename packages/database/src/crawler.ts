import { prisma } from './index.js';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// 1. Fetch from Brasil API
async function fetchBrasilApi(cnpj) {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  console.log(`Buscando CNPJ ${cleanCnpj} na Brasil API...`);
  
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: {
        'User-Agent': 'TzolkinLeadFinder/1.0 (contato@tzolkin.com)'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Falha ao buscar Brasil API:`, err.message);
    return null;
  }
}

// 2. Fetch from Serper (Google Search)
async function searchGoogle(query) {
  console.log(`Buscando no Google: "${query}"...`);
  if (!SERPER_API_KEY) {
    console.warn('⚠️ SERPER_API_KEY não encontrada. Usando dados mockados para testes.');
    // Mock data
    if (query.includes('vagas')) {
      return {
        organic: [
          { title: 'Vaga de Vendedor', snippet: 'Estamos contratando vendedor com experiência.' },
          { title: 'Vaga Marketing', snippet: 'Venha fazer parte do nosso time de expansão!' }
        ]
      };
    }
    if (query.includes('notícias') || query.includes('investimento') || query.includes('expansão')) {
      return {
        news: [
          { title: 'Empresa levanta rodada Série A de R$ 10 milhões', snippet: 'Nova rodada de investimento focada em expansão nacional.' }
        ],
        organic: [
          { title: 'Crescimento de 50% em 2026', snippet: 'A empresa vem em forte expansão no último trimestre.' }
        ]
      };
    }
    return { organic: [] };
  }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt' })
    });
    return await res.json();
  } catch (err) {
    console.error('Falha ao buscar Serper:', err.message);
    return { organic: [] };
  }
}

// 3. Process Signals
async function processSignals(business) {
  const signalsToCreate = [];

  // Vagas
  const jobsSearch = await searchGoogle(`"${business.name}" vagas`);
  const jobsText = (jobsSearch.organic || []).map(r => r.title + ' ' + r.snippet).join(' ').toLowerCase();
  
  if (jobsText.includes('vaga') || jobsText.includes('contratando') || jobsText.includes('oportunidade')) {
    signalsToCreate.push({
      type: 'Contratando',
      axis: 'MOMENTO',
      source: 'GOOGLE_SEARCH_JOBS',
      evidence: { keywordsMatched: true, searchResults: jobsSearch.organic?.slice(0, 2) }
    });
  }

  // Notícias (Rodada/Expansão)
  const newsSearch = await searchGoogle(`"${business.name}" investimento OR expansão`);
  const newsText = (newsSearch.news || []).concat(newsSearch.organic || []).map(r => r.title + ' ' + r.snippet).join(' ').toLowerCase();
  
  if (newsText.includes('série a') || newsText.includes('série b') || newsText.includes('investimento') || newsText.includes('aporte')) {
    signalsToCreate.push({
      type: 'Rodada de Investimento',
      axis: 'DINHEIRO',
      source: 'GOOGLE_SEARCH_NEWS',
      evidence: { keywordsMatched: true, searchResults: newsSearch.news?.slice(0, 2) }
    });
  } 
  
  if (newsText.includes('expansão') || newsText.includes('crescimento')) {
    signalsToCreate.push({
      type: 'Expansão',
      axis: 'MOMENTO',
      source: 'GOOGLE_SEARCH_NEWS',
      evidence: { keywordsMatched: true, searchResults: newsSearch.organic?.slice(0, 2) }
    });
  }

  return signalsToCreate;
}

// 4. Main Crawler Loop
async function runCrawler() {
  console.log('Iniciando Crawler de Enriquecimento...');
  
  // Buscar empresas pendentes (Sem CNAE)
  const pendingBusinesses = await prisma.canonicalBusiness.findMany({
    where: {
      cnpj: { not: null },
      cnaeCode: null
    },
    take: 5
  });

  if (pendingBusinesses.length === 0) {
    console.log('Nenhuma empresa real encontrada. Criando uma empresa de teste fictícia para validar o fluxo...');
    
    // Seed fake business
    const fakeBusiness = await prisma.canonicalBusiness.create({
      data: {
        name: 'Tech Corp S.A',
        cnpj: '19.131.243/0001-97', // Valid CNPJ format, could be Contabilizei or something
      }
    });
    pendingBusinesses.push(fakeBusiness);
  }

  for (const business of pendingBusinesses) {
    console.log(`\n---------------------------------`);
    console.log(`Processando: ${business.name} (CNPJ: ${business.cnpj})`);
    
    // 1. Brasil API (CNAE e Local)
    const rfData = await fetchBrasilApi(business.cnpj);
    let cnaeCode = null;
    let city = null;
    let state = null;
    
    if (rfData) {
      cnaeCode = rfData.cnae_fiscal ? String(rfData.cnae_fiscal) : null;
      city = rfData.municipio;
      state = rfData.uf;
      
      // Registrar Observação (Audit Log Imutável)
      await prisma.observation.create({
        data: {
          canonicalId: business.id,
          source: 'BRASIL_API_CNPJ',
          payload: rfData,
          payloadHash: `rf_${rfData.cnpj}_${Date.now()}`
        }
      });
      console.log(`✅ BrasilAPI: CNAE=${cnaeCode}, Cidade=${city}-${state}`);
    }

    // 2. Sinais (Google Search)
    const newSignals = await processSignals(business);
    
    for (const sig of newSignals) {
      await prisma.signal.create({
        data: {
          canonicalId: business.id,
          type: sig.type,
          axis: sig.axis,
          source: sig.source,
          evidence: sig.evidence,
          observedAt: new Date()
        }
      });
      console.log(`🎯 Sinal Detectado: [${sig.type}] via ${sig.source}`);
    }

    // 3. Atualizar Canonical Business
    await prisma.canonicalBusiness.update({
      where: { id: business.id },
      data: {
        cnaeCode: cnaeCode || undefined,
        city: city || undefined,
        state: state || undefined,
        lastObservedAt: new Date()
      }
    });
    
    console.log(`Empresa atualizada no banco.`);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\nCrawler finalizado.');
}

runCrawler().catch(console.error).finally(() => prisma.$disconnect());
