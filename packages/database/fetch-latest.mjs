import { prisma } from './dist/index.js';

async function main() {
  const reports = await prisma.businessReport.findMany({
    take: 3,
    orderBy: { updatedAt: 'desc' },
    include: { business: true }
  });
  console.log(JSON.stringify(reports, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

