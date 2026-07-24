import { prisma } from './dist/index.js';

async function run() {
  console.log('=== TESTANDO CONEXÃO DE BANCO DE DADOS E BUSCA DE USUÁRIO MASTER ===');
  const user = await prisma.user.findFirst({
    where: { email: 'admin@tzolkin.com.br' },
    include: { tenant: true },
  });
  console.log('Usuário master localizado:', user ? user.email : 'Nenhum usuário master ainda');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
