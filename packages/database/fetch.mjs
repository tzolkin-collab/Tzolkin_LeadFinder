import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.businessReport.findUnique({where:{businessId:'cmrwfk6wf000xtf588plehvb6'}, include:{business:true}})
  .then(res => console.log(JSON.stringify(res, null, 2)))
  .catch(console.error)
  .finally(() => p.$disconnect());
