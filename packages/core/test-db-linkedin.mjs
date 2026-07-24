import { prisma } from '../database/dist/index.js';
import { SerperClient } from './dist/index.js';

const client = new SerperClient({ apiKey: '7424bf20659d4056ec89623706530c4e4f52b98f' });

function extractCity(address) {
  if (!address) return undefined;
  if (address.includes('Belo Horizonte')) return 'Belo Horizonte';
  const parts = address.split('-');
  return parts.length >= 2 ? parts[parts.length - 2]?.trim() : address;
}

async function runTest() {
  console.log('=== TESTANDO BUSCA DE DECISORES E LINEDIN NAS EMPRESAS DO BANCO (COM CIDADE LIMPA) ===\n');

  const businesses = await prisma.business.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, address: true, category: true },
  });

  for (const b of businesses) {
    const city = extractCity(b.address);
    console.log(`==================================================`);
    console.log(`📍 Empresa: "${b.name}" | Categoria: ${b.category || 'N/A'}`);
    console.log(`📍 Cidade Extraída: "${city}"`);

    const companyUrl = await client.searchLinkedInCompanyUrl(b.name, city);
    console.log(`🔗 Página LinkedIn: ${companyUrl || 'Não encontrada'}`);

    const decisionMakers = await client.searchDecisionMakers(b.name, city);
    console.log(`👥 Decisores (${decisionMakers.length}):`);
    decisionMakers.forEach((dm, idx) => {
      console.log(`   ${idx + 1}. ${dm.name} (${dm.role || 'Sem cargo'})`);
      console.log(`      LinkedIn: ${dm.linkedinUrl}`);
    });
    console.log('');
  }

  await prisma.$disconnect();
}

runTest().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
