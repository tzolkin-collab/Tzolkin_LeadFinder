import { estimateRevenueBracket } from './revenue-calculator.mjs';

/**
 * Tzolkin Hybrid Data Router
 * 
 * Intercepts data enrichment requests and routes them to either
 * expensive third-party APIs or internal low-cost heuristic engines
 * depending on the requesting Tenant's billing plan.
 */
export async function getRevenueDataForLead(tenantPlan, leadData) {
  
  console.log(`[Data Router] Iniciando enriquecimento de faturamento para plano: ${tenantPlan}`);
  
  // 1. Checa cache (CanonicalBusiness Master Table)
  // (Simulado) Se o dado premium (Econodata) já existir no Prisma devido a uma pesquisa
  // de um usuário Enterprise no passado, nós sempre retornamos de graça.
  const cachedPremiumData = null; // Simulating cache miss
  if (cachedPremiumData) {
     console.log('[Data Router] Cache Hit! Retornando dado premium arquivado de graça.');
     return cachedPremiumData;
  }

  // 2. Roteamento baseado no Plano
  if (tenantPlan === 'PRO' || tenantPlan === 'ENTERPRISE') {
      // OPÇÃO A: API Premium (Alto custo, Alta precisão)
      console.log('[Data Router] Plano Premium detectado. Roteando para API de terceiros (Ex: Econodata)...');
      
      // Simulando chamada de API
      const mockEconodataResponse = {
          source: 'THIRD_PARTY_API',
          revenueBracket: 'R$ 4.8 milhões - R$ 20 milhões',
          accuracy: 0.95,
          cost: 'R$ 1.00'
      };
      
      // TODO: Salvar na base CanonicalMaster para futuros hits (Cache)
      return mockEconodataResponse;
      
  } else {
      // OPÇÃO B: Motor Proprietário Tzolkin (Custo quase zero)
      console.log('[Data Router] Plano Básico detectado. Roteando para Motor Interno (Scraping + GPT)...');
      
      const estimatedBracket = estimateRevenueBracket(
         leadData.capitalSocial,
         leadData.porte,
         leadData.ageYears,
         leadData.linkedInEmployees,
         leadData.cnaeCode
      );
      
      return {
          source: 'TZOLKIN_INTERNAL_ENGINE',
          revenueBracket: estimatedBracket,
          accuracy: 0.75,
          cost: 'R$ 0.01'
      };
  }
}

// Simulando a execução
if (process.argv[1] && process.argv[1].endsWith('data-router.mjs')) {
    const leadMock = {
       capitalSocial: 100000,
       porte: 'EPP',
       ageYears: 5,
       linkedInEmployees: 35,
       cnaeCode: '6204-0/00'
    };

    console.log('\n--- Teste 1: Usuário STARTER ---');
    getRevenueDataForLead('STARTER', leadMock).then(console.log);

    console.log('\n--- Teste 2: Usuário ENTERPRISE ---');
    getRevenueDataForLead('ENTERPRISE', leadMock).then(console.log);
}
