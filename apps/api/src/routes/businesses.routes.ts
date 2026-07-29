import { Router } from 'express';
import { z } from 'zod';
import { prisma, listTenantBusinesses } from '@tzolkin/database';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authMiddleware);

// GET /api/businesses (or /api/v1/businesses)
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const status = req.query.status as 'PENDING' | 'REVIEWED' | 'CONTACTED' | 'REJECTED' | undefined;
    const search = req.query.search as string | undefined;

    // Fonte única de "listar negócios do tenant" — ver
    // packages/database/src/services/tenant-business.service.ts. Isolamento
    // por tenant é garantido dentro da própria função.
    const result = await listTenantBusinesses(tenantId, { search, status, page, limit });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/businesses/stats (or /api/v1/businesses/stats)
router.get('/stats', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    // Strict tenant isolation for stats.
    const baseWhere = { tenantId };

    const [total, withoutWebsite, reviewed, contacted] = await Promise.all([
      prisma.business.count({ where: baseWhere }),
      prisma.business.count({ where: { ...baseWhere, hasWebsite: false } }),
      prisma.business.count({ where: { ...baseWhere, report: { isNot: null } } }),
      prisma.business.count({ where: { ...baseWhere, report: { status: 'CONTACTED' } } }),
    ]);

    res.json({
      total,
      withoutWebsite,
      reviewed,
      contacted,
      pending: total - reviewed,
      withoutReport: total - reviewed,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/businesses/:id (or /api/v1/businesses/:id)
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;

    const business = await prisma.business.findFirst({
      where: { id, tenantId },
      include: { report: true },
    });

    if (!business) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    res.json(business);
  } catch (error) {
    next(error);
  }
});

const StatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'CONTACTED', 'REJECTED']),
});

// PATCH /api/businesses/:id/status (or /api/v1/businesses/:id/status)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;
    const { status } = StatusSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id, tenantId },
    });

    if (!business) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    const report = await prisma.businessReport.upsert({
      where: { businessId: id },
      update: { status },
      create: {
        businessId: id,
        status,
      },
    });

    res.json({ message: 'Status atualizado com sucesso', report });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/businesses/:id (or /api/v1/businesses/:id)
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;

    const business = await prisma.business.findFirst({
      where: { id, tenantId },
    });

    if (!business) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    await prisma.business.delete({
      where: { id },
    });

    res.json({ message: 'Negócio removido com sucesso' });
  } catch (error) {
    next(error);
  }
});

export default router;
