import { SerperClient } from './dist/index.js';

const serperKey = process.env.SERPER_API_KEY || '7424bf20659d4056ec89623706530c4e4f52b98f';
const client = new SerperClient({ apiKey: serperKey });

async function runTest() {
  console.log('=== TESTANDO BUSCA DE DECISORES E EMPRESAS NO LINKEDIN VIA SERPER.DEV ===\n');

  // Test 1: Assinatura Marca Própria
  console.log('--- Teste 1: Assinatura Marca Própria (Belo Horizonte) ---');
  const company1 = await client.searchLinkedInCompanyUrl('Assinatura Marca Própria', 'Belo Horizonte');
  console.log('LinkedIn Company URL:', company1);

  const dm1 = await client.searchDecisionMakers('Assinatura Marca Própria', 'Belo Horizonte');
  console.log('Decisores Encontrados:', JSON.stringify(dm1, null, 2));

  console.log('\n--- Teste 2: Advocacia Alexandre Atheniense (Belo Horizonte) ---');
  const company2 = await client.searchLinkedInCompanyUrl('Alexandre Atheniense Advocacia', 'Belo Horizonte');
  console.log('LinkedIn Company URL:', company2);

  const dm2 = await client.searchDecisionMakers('Alexandre Atheniense Advocacia', 'Belo Horizonte');
  console.log('Decisores Encontrados:', JSON.stringify(dm2, null, 2));

  console.log('\n--- Teste 3: Tzolkin (Belo Horizonte) ---');
  const company3 = await client.searchLinkedInCompanyUrl('Tzolkin', 'Belo Horizonte');
  console.log('LinkedIn Company URL:', company3);

  const dm3 = await client.searchDecisionMakers('Tzolkin', 'Belo Horizonte');
  console.log('Decisores Encontrados:', JSON.stringify(dm3, null, 2));
}

runTest().catch(console.error);
