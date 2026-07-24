import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const reports = await p.businessReport.findMany({
    take: 3,
    orderBy: { updatedAt: 'desc' },
    include: { business: true }
  });
  console.log(JSON.stringify(reports, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
