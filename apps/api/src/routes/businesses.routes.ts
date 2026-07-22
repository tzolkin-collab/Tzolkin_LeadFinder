import { Router } from 'express';
import { prisma } from '@tzolkin/database';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authMiddleware);

// GET /api/businesses (or /api/v1/businesses)
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const skip = (page - 1) * limit;
    const whereClause: Record<string, unknown> = { tenantId };

    if (search) {
      whereClause['name'] = { contains: search, mode: 'insensitive' };
    }

    if (status) {
      whereClause['report'] = { status };
    }

    const [total, businesses] = await Promise.all([
      prisma.business.count({ where: whereClause }),
      prisma.business.findMany({
        where: whereClause,
        include: { report: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/businesses/stats (or /api/v1/businesses/stats)
router.get('/stats', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const [total, withoutWebsite, reviewed] = await Promise.all([
      prisma.business.count({ where: { tenantId } }),
      prisma.business.count({ where: { tenantId, hasWebsite: false } }),
      prisma.business.count({ where: { tenantId, report: { isNot: null } } }),
    ]);

    res.json({
      total,
      withoutWebsite,
      reviewed,
      pendingReview: total - reviewed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
