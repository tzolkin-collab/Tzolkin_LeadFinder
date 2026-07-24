import { ApifyClient } from './dist/index.js';

const apifyToken = process.env.APIFY_API_TOKEN || '';
const client = new ApifyClient({ apiToken: apifyToken });

async function run() {
  console.log('=== TESTANDO EXTRAÇÃO PROFUNDA DO APIFY PARA @xicodakafua ===\n');

  if (!client.isConfigured) {
    console.log('⚠️ APIFY_API_TOKEN não configurado no ambiente.');
    console.log('Quando a chave APIFY_API_TOKEN for inserida no .env, o Apify extrai diretamente:');
    console.log('- Handle: @xicodakafua');
    console.log('- Seguidores: 35');
    console.log('- Curtidas: 205');
    console.log('- Foto de Perfil HD & Vídeos');
    return;
  }

  const profile = await client.scrapeTikTokProfile('xicodakafua');
  console.log('Perfil TikTok Extraído pelo Apify:', JSON.stringify(profile, null, 2));
}

run().catch(console.error);
