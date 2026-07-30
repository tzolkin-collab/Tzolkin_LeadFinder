/**
 * Teste de estresse da taxonomia contra o BANCO REAL de dev.
 *
 * Responde à pergunta "isso é seguro para não criar categorias infinitas?" com
 * medição, não com argumento. Os testes unitários provam o decisor puro; este
 * script prova o caminho completo, incluindo a persistência e as constraints do
 * Postgres.
 *
 * Uso: `pnpm --filter api run taxonomy:stress`
 */
import {
  prisma,
  seedServiceTaxonomy,
  resolveServiceSubcategory,
  taxonomyHealth,
  TAXONOMY_LIMITS,
} from '@tzolkin/database';

if (process.env.NODE_ENV === 'production') {
  throw new Error('taxonomy-stress.ts nunca deve rodar contra produção.');
}

async function countByStatus() {
  const rows = await prisma.serviceSubcategory.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = r._count._all;
    return acc;
  }, {});
}

async function main() {
  console.log('🧪 Estresse da taxonomia — banco de dev\n');

  const seedResult = await seedServiceTaxonomy();
  console.log(`Semente: ${seedResult.created} criadas, ${seedResult.existing} já existiam`);
  console.log('Estado inicial:', JSON.stringify(await countByStatus()), '\n');

  const before = await countByStatus();

  // ── Ataque 1: variações de escrita do mesmo termo ────────────────────────
  console.log('── Ataque 1: 8 variações de escrita de "tráfego pago"');
  const variacoes = [
    'Tráfego Pago',
    'trafego pago',
    'TRAFEGO PAGO',
    'tráfego  pago',
    'Trafego Pago!',
    'trafego pagoo',
    'gestão de tráfego',
    'mídia paga',
  ];
  const acoes1: Record<string, number> = {};
  for (const v of variacoes) {
    const r = await resolveServiceSubcategory({
      rawLabel: v,
      category: 'MARKETING_DIGITAL',
      tenantId: 'stress-tenant-1',
    });
    acoes1[r.action.kind] = (acoes1[r.action.kind] ?? 0) + 1;
  }
  console.log('  ações:', JSON.stringify(acoes1));
  console.log('  linhas depois:', JSON.stringify(await countByStatus()), '\n');

  // ── Ataque 2: 60 termos inventados por 60 tenants distintos ──────────────
  console.log('── Ataque 2: 60 termos inventados, 60 tenants distintos (sem rate limit)');
  const acoes2: Record<string, number> = {};
  for (let i = 0; i < 60; i++) {
    const r = await resolveServiceSubcategory({
      rawLabel: `servico inventado alfa ${i} beta`,
      category: 'DESIGN',
      tenantId: `stress-tenant-flood-${i}`,
    });
    acoes2[r.action.kind] = (acoes2[r.action.kind] ?? 0) + 1;
    if (r.action.kind === 'REJECT') {
      acoes2[`REJECT:${r.action.reason}`] = (acoes2[`REJECT:${r.action.reason}`] ?? 0) + 1;
    }
  }
  console.log('  ações:', JSON.stringify(acoes2));
  console.log('  linhas depois:', JSON.stringify(await countByStatus()), '\n');

  // ── Ataque 3: um tenant só, spam de termos novos (rate limit) ────────────
  console.log('── Ataque 3: 1 tenant, 15 termos novos (deve bater no rate limit)');
  const acoes3: Record<string, number> = {};
  for (let i = 0; i < 15; i++) {
    const r = await resolveServiceSubcategory({
      rawLabel: `spam unico gama ${i} delta`,
      category: 'CONSULTORIA',
      tenantId: 'stress-tenant-spammer',
    });
    const key = r.action.kind === 'REJECT' ? `REJECT:${r.action.reason}` : r.action.kind;
    acoes3[key] = (acoes3[key] ?? 0) + 1;
  }
  console.log('  ações:', JSON.stringify(acoes3), '\n');

  // ── Resultado ───────────────────────────────────────────────────────────
  const after = await countByStatus();
  const health = await taxonomyHealth();

  console.log('══ RESULTADO ══');
  console.log('antes: ', JSON.stringify(before));
  console.log('depois:', JSON.stringify(after));
  console.log('\nTetos por categoria:');
  for (const c of health.categories) {
    console.log(
      `  ${c.category.padEnd(20)} ACTIVE ${String(c.active).padStart(3)}/${TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY} (${c.activeCapUsedPct}%)  PENDING ${String(c.pending).padStart(3)}/${TAXONOMY_LIMITS.MAX_PENDING_PER_CATEGORY} (${c.pendingCapUsedPct}%)`,
    );
  }

  const activeTotal = after.ACTIVE ?? 0;
  const CATEGORIES = 5;
  const maxActive = CATEGORIES * TAXONOMY_LIMITS.MAX_ACTIVE_PER_CATEGORY;
  console.log(
    `\nACTIVE total: ${activeTotal} / teto absoluto ${maxActive} — ${activeTotal <= maxActive ? '✅ dentro do limite' : '❌ ESTOUROU'}`,
  );

  // ── Limpeza: remove tudo que o estresse criou ────────────────────────────
  const removed = await prisma.serviceSubcategory.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: 'servico-inventado-alfa' } },
        { slug: { startsWith: 'spam-unico-gama' } },
      ],
    },
  });
  console.log(`\nLimpeza: ${removed.count} linhas de teste removidas.`);
  console.log('Estado final:', JSON.stringify(await countByStatus()));
}

main()
  .catch((err) => {
    console.error('Estresse falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
