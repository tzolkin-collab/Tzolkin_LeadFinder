import { SerperClient } from './dist/index.js';

const client = new SerperClient({ apiKey: '7424bf20659d4056ec89623706530c4e4f52b98f' });

async function run() {
  console.log('=== TESTANDO BUSCA DE TIKTOK PARA RESTAURANTE XICO DA KAFUA ===\n');
  const tiktok = await client.searchTikTokHandle('Restaurante Xico da Kafua', 'Belo Horizonte');
  console.log('TikTok Handle Encontrado:', tiktok);
}

run().catch(console.error);
