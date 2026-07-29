/**
 * Seed de desenvolvimento — NÃO É DADO REAL.
 *
 * Popula a base canônica com negócios sintéticos (nomes/CNPJs inventados,
 * placeId prefixado "seed-") e roda o motor real (SignalService,
 * DiagnosticService, OutboundPatternIntelligenceService) sobre eles. O
 * objetivo é testar o motor de diff → sinal → diagnóstico e o benchmark do
 * copiloto de pitch antes do cliente zero gerar uso real — sem esperar
 * semanas de coleta ao vivo e sem inventar número solto na tela.
 *
 * Cada negócio ganha Observation com `observedAt` retroativo, simulando
 * histórico de semanas. Os sinais são gerados por SignalService.evaluateSignals
 * de verdade, não fabricados à parte — se o motor tiver um bug, o seed expõe.
 *
 * A distribuição de OutboundPatternIntelligence é sintética e documentada
 * (RNG determinístico, sem generalização de mercado real) — existe só para o
 * benchmark do copiloto ter uma amostra >= 5 para testar o estado "com dado"
 * e ficar null pros combos abaixo do mínimo, testando o estado "sem dado".
 *
 * Roda só fora de produção. Uso: `pnpm --filter api run seed:dev`
 */
import bcrypt from 'bcryptjs';
import { prisma, resolveCanonicalBusiness, linkTenantBusiness, recordObservation } from '@tzolkin/database';
import { SignalService, DiagnosticService, OutboundPatternIntelligenceService } from '@tzolkin/core';

/** Credenciais de dev para logar no tenant de seed e ver os dados simulados na UI. */
const SEED_USER_EMAIL = 'seed@tzolkin.dev';
const SEED_USER_PASSWORD = 'seed-dev-2026';

if (process.env.NODE_ENV === 'production') {
  throw new Error('seed-dev-data.ts nunca deve rodar contra produção.');
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

/** PRNG determinístico — mesma seed, mesmos números, toda vez que o script roda. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedBusinessDef {
  key: string;
  name: string;
  niche: string;
  category: string;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Observações do Google Places, da mais antiga para a mais nova. */
  placesHistory: Array<{ daysAgo: number; hasWebsite: boolean; websiteUrl: string | null; reviewCount: number }>;
  /** Observações do Meta Ads Library, da mais antiga para a mais nova. Omitir = sem histórico de ads. */
  adsHistory?: Array<{ daysAgo: number; adsCount: number }>;
  /** Idade do CNPJ em dias. <= 90 dispara CNPJ_RECENTE. */
  cnpjAgeDays: number;
}

const BUSINESSES: SeedBusinessDef[] = [
  {
    key: 'seed-odonto-sorriso-pleno',
    name: 'Clínica Sorriso Pleno',
    niche: 'odontologia',
    category: 'Clínica odontológica',
    city: 'Belo Horizonte',
    state: 'MG',
    address: 'Av. Afonso Pena, 1500 - Centro',
    latitude: -19.9227,
    longitude: -43.9451,
    placesHistory: [
      { daysAgo: 60, hasWebsite: false, websiteUrl: null, reviewCount: 40 },
      { daysAgo: 7, hasWebsite: false, websiteUrl: null, reviewCount: 40 },
    ],
    adsHistory: [
      { daysAgo: 45, adsCount: 0 },
      { daysAgo: 10, adsCount: 3 },
    ],
    cnpjAgeDays: 900,
  },
  {
    key: 'seed-odonto-vida-nova',
    name: 'Odonto Vida Nova',
    niche: 'odontologia',
    category: 'Clínica odontológica',
    city: 'Contagem',
    state: 'MG',
    address: 'Rua das Industrias, 220 - Eldorado',
    latitude: -19.9317,
    longitude: -44.0536,
    placesHistory: [{ daysAgo: 20, hasWebsite: false, websiteUrl: null, reviewCount: 8 }],
    cnpjAgeDays: 45,
  },
  {
    key: 'seed-academia-fibra-total',
    name: 'Academia Fibra Total',
    niche: 'academia',
    category: 'Academia de ginástica',
    city: 'Belo Horizonte',
    state: 'MG',
    address: 'Rua Pium-í, 300 - Santo Agostinho',
    latitude: -19.9364,
    longitude: -43.9425,
    placesHistory: [{ daysAgo: 30, hasWebsite: false, websiteUrl: null, reviewCount: 60 }],
    cnpjAgeDays: 1200,
  },
  {
    key: 'seed-academia-powerfit',
    name: 'PowerFit Studio',
    niche: 'academia',
    category: 'Academia de ginástica',
    city: 'Belo Horizonte',
    state: 'MG',
    address: 'Av. do Contorno, 4000 - Funcionários',
    latitude: -19.9275,
    longitude: -43.9376,
    placesHistory: [
      { daysAgo: 50, hasWebsite: false, websiteUrl: null, reviewCount: 30 },
      { daysAgo: 3, hasWebsite: true, websiteUrl: 'https://powerfitstudio.example.com', reviewCount: 33 },
    ],
    cnpjAgeDays: 700,
  },
  {
    key: 'seed-oficina-marcelo',
    name: 'Oficina do Marcelo',
    niche: 'oficina mecânica',
    category: 'Oficina mecânica',
    city: 'Betim',
    state: 'MG',
    address: 'Av. Governador Valadares, 900 - Centro',
    latitude: -19.9678,
    longitude: -44.1972,
    placesHistory: [
      { daysAgo: 40, hasWebsite: false, websiteUrl: null, reviewCount: 18 },
      { daysAgo: 5, hasWebsite: false, websiteUrl: null, reviewCount: 27 },
    ],
    adsHistory: [
      { daysAgo: 35, adsCount: 2 },
      { daysAgo: 5, adsCount: 5 },
    ],
    cnpjAgeDays: 1500,
  },
  {
    key: 'seed-oficina-nova-alianca',
    name: 'Auto Center Nova Aliança',
    niche: 'oficina mecânica',
    category: 'Oficina mecânica',
    city: 'Contagem',
    state: 'MG',
    address: 'Av. João César de Oliveira, 1200 - Eldorado',
    latitude: -19.9345,
    longitude: -44.0601,
    // Só uma observação de propósito: testa o caso honesto de "nada de
    // interessante ainda" — sem segunda observação não há diff possível.
    placesHistory: [{ daysAgo: 10, hasWebsite: true, websiteUrl: 'https://autocenternovaalianca.example.com', reviewCount: 52 }],
    cnpjAgeDays: 2000,
  },
];

/** Combos de padrão de outbound a popular no Cérebro Global — sintético, documentado no topo do arquivo. */
const PATTERN_SEEDS: Array<{
  niche: string;
  gatekeeperStrategy: 'GK_DIRECT_DECISION_MAKER' | 'GK_TECHNICAL_PARTNER' | 'GK_SCHEDULED_REASON' | 'GK_LOW_FRICTION_QUESTION';
  painPoint: 'PAIN_WASTED_AD_SPEND' | 'PAIN_REFERRAL_DEPENDENCY' | 'PAIN_COMPETITOR_DOMINANCE' | 'PAIN_LOW_CONVERSION_LEADS' | 'PAIN_POOR_DIGITAL_AUTHORITY';
  objectionStrategy: 'AUDIT_GAP_PROOF' | 'ASYNC_MICRO_DEMO' | 'ROI_WASTE_CALCULATION' | 'METHOD_DIFFERENTIATION';
  attempts: number;
  responseProbability: number;
  meetingProbability: number;
}> = [
  {
    // Amostra acima do mínimo (5) — deve aparecer com benchmarkResponseRate real.
    // niche usa o mesmo valor de Business.category — é o que o frontend
    // realmente tem disponível para mandar no POST /audit-pitch, não existe
    // campo de "nicho normalizado" separado ainda.
    niche: 'Clínica odontológica',
    gatekeeperStrategy: 'GK_TECHNICAL_PARTNER',
    painPoint: 'PAIN_WASTED_AD_SPEND',
    objectionStrategy: 'ASYNC_MICRO_DEMO',
    attempts: 22,
    responseProbability: 0.32,
    meetingProbability: 0.09,
  },
  {
    // Amostra abaixo do mínimo (5) — deve voltar benchmarkResponseRate null.
    niche: 'Academia de ginástica',
    gatekeeperStrategy: 'GK_LOW_FRICTION_QUESTION',
    painPoint: 'PAIN_REFERRAL_DEPENDENCY',
    objectionStrategy: 'METHOD_DIFFERENTIATION',
    attempts: 3,
    responseProbability: 0.25,
    meetingProbability: 0.05,
  },
];

async function seedTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'tzolkin-dev-seed' },
    update: {},
    create: {
      slug: 'tzolkin-dev-seed',
      name: 'Tzolkin — Dados Simulados (dev)',
      plan: 'PRO',
      status: 'ACTIVE',
    },
  });

  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: SEED_USER_EMAIL } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: SEED_USER_EMAIL,
      name: 'Seed Dev',
      passwordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  return tenant;
}

async function seedBusiness(tenantId: string, def: SeedBusinessDef) {
  const canonical = await resolveCanonicalBusiness({
    placeId: def.key,
    name: def.name,
    address: def.address,
    city: def.city,
    state: def.state,
    category: def.category,
    latitude: def.latitude,
    longitude: def.longitude,
  });

  const latestPlaces = def.placesHistory[def.placesHistory.length - 1]!;

  const business = await prisma.business.upsert({
    where: { tenantId_placeId: { tenantId, placeId: def.key } },
    update: {
      hasWebsite: latestPlaces.hasWebsite,
      websiteUrl: latestPlaces.websiteUrl,
      reviewCount: latestPlaces.reviewCount,
      canonicalId: canonical.id,
    },
    create: {
      tenantId,
      placeId: def.key,
      name: def.name,
      address: def.address,
      category: def.category,
      hasWebsite: latestPlaces.hasWebsite,
      websiteUrl: latestPlaces.websiteUrl,
      reviewCount: latestPlaces.reviewCount,
      latitude: def.latitude,
      longitude: def.longitude,
      searchQuery: `[seed] ${def.niche}`,
      canonicalId: canonical.id,
    },
  });

  await linkTenantBusiness(business.id, canonical.id);

  for (const snapshot of def.placesHistory) {
    await recordObservation({
      canonicalId: canonical.id,
      source: 'GOOGLE_PLACES',
      observedAt: daysAgo(snapshot.daysAgo),
      payload: {
        placeId: def.key,
        address: def.address,
        hasWebsite: snapshot.hasWebsite,
        websiteUrl: snapshot.websiteUrl,
        reviewCount: snapshot.reviewCount,
      },
    });
  }

  for (const snapshot of def.adsHistory ?? []) {
    await recordObservation({
      canonicalId: canonical.id,
      source: 'META_ADS_LIBRARY',
      observedAt: daysAgo(snapshot.daysAgo),
      payload: {
        adsCount: snapshot.adsCount,
        adsLibraryUrl: `https://www.facebook.com/ads/library/?q=${encodeURIComponent(def.name)}`,
      },
    });
  }

  await recordObservation({
    canonicalId: canonical.id,
    source: 'BRASIL_API',
    observedAt: daysAgo(def.cnpjAgeDays),
    payload: {
      cnpj: `00.000.000/0001-${String(Math.abs(def.key.length * 7) % 100).padStart(2, '0')}`,
      razaoSocial: `${def.name} LTDA`,
      dataInicioAtividade: daysAgo(def.cnpjAgeDays).toISOString(),
    },
  });

  // evaluateSignals não é idempotente (não existe dedup de Signal por
  // canonicalId+type+source+observedAt) — sem isto, rodar o seed 2x duplica
  // sinais. É uma lacuna real do motor, não só do seed; ver nota no relatório.
  await prisma.signal.deleteMany({ where: { canonicalId: canonical.id } });
  const signals = await new SignalService().evaluateSignals(canonical.id);
  const diagnosis = await new DiagnosticService().generateDiagnosis(canonical.id);

  return { business, canonical, signals, diagnosis };
}

async function seedOutboundPatterns() {
  const service = new OutboundPatternIntelligenceService();
  const rng = mulberry32(20260729);
  const results: Array<{ combo: (typeof PATTERN_SEEDS)[number]; attemptsRecorded: number }> = [];

  for (const combo of PATTERN_SEEDS) {
    // recordOutcome incrementa attemptsCount — sem isto, rodar o seed 2x
    // dobra a amostra (mesma lacuna de idempotência do Signal, ver acima).
    await prisma.outboundPatternIntelligence.deleteMany({
      where: {
        niche: combo.niche,
        gatekeeperStrategy: combo.gatekeeperStrategy,
        painPoint: combo.painPoint,
        objectionStrategy: combo.objectionStrategy,
      },
    });

    for (let i = 0; i < combo.attempts; i++) {
      const roll = rng();
      const outcome: 'RESPONDED' | 'MEETING_SET' | 'REJECTED' =
        roll < combo.meetingProbability
          ? 'MEETING_SET'
          : roll < combo.responseProbability
            ? 'RESPONDED'
            : 'REJECTED';

      await service.recordOutcome({
        niche: combo.niche,
        gatekeeperStrategy: combo.gatekeeperStrategy,
        painPoint: combo.painPoint,
        objectionStrategy: combo.objectionStrategy,
        outcome,
        wordCount: 55 + Math.round(rng() * 30),
      });
    }
    results.push({ combo, attemptsRecorded: combo.attempts });
  }

  return results;
}

async function main() {
  console.log('🧪 Seed de desenvolvimento — dados simulados, não reais.\n');

  const tenant = await seedTenant();
  console.log(`Tenant de seed: ${tenant.name} (${tenant.id})\n`);

  for (const def of BUSINESSES) {
    const { business, signals, diagnosis } = await seedBusiness(tenant.id, def);
    console.log(`— ${def.name} [${def.niche}]`);
    console.log(`  business: ${business.id}  canonical: ${business.canonicalId}`);
    console.log(`  sinais avaliados agora: ${signals.map((s) => s.type).join(', ') || '(nenhum sinal novo — observações já processadas antes)'}`);
    console.log(`  score do diagnóstico: ${diagnosis.suitabilityScore} — ${diagnosis.thesis.slice(0, 70)}...\n`);
  }

  const patternResults = await seedOutboundPatterns();
  console.log('Cérebro Global de outbound populado:');
  for (const { combo, attemptsRecorded } of patternResults) {
    const row = await prisma.outboundPatternIntelligence.findUnique({
      where: {
        niche_gatekeeperStrategy_painPoint_objectionStrategy: {
          niche: combo.niche,
          gatekeeperStrategy: combo.gatekeeperStrategy,
          painPoint: combo.painPoint,
          objectionStrategy: combo.objectionStrategy,
        },
      },
    });
    console.log(
      `  ${combo.niche} / ${combo.gatekeeperStrategy} / ${combo.painPoint} / ${combo.objectionStrategy}: ` +
        `${attemptsRecorded} tentativas simuladas → responseRate real gravado = ${row?.responseRate.toFixed(2)}%`,
    );
  }

  console.log('\nPronto. Use o tenant acima para logar e testar /business/:id, ou chame diretamente:');
  console.log('  POST /api/businesses/:id/analyze');
  console.log('  POST /api/businesses/:id/audit-pitch');
}

main()
  .catch((err) => {
    console.error('Seed falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
