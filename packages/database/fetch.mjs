import { prisma } from './dist/index.js';
prisma.businessReport.findUnique({where:{businessId:'cmrwfk6wf000xtf588plehvb6'}, include:{business:true}})
  .then(res => console.log(JSON.stringify(res, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());

