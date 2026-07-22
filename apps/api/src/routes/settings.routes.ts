import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@tzolkin/database';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authMiddleware);

// GET /api/settings/users (or /api/v1/settings/users)
router.get('/users', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).or(
    z.enum(['admin', 'editor', 'viewer']).transform(val => {
      if (val === 'admin') return 'ADMIN';
      if (val === 'editor') return 'MEMBER';
      return 'VIEWER';
    }),
  ).default('MEMBER'),
});

// POST /api/settings/users
router.post('/users', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const input = CreateUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { tenantId, email: input.email },
    });

    if (existing) {
      res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
      return;
    }

    const defaultPasswordHash = await bcrypt.hash('tzolkin123', 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: defaultPasswordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ message: 'Usuário criado com sucesso', user });
  } catch (error) {
    next(error);
  }
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).or(
    z.enum(['admin', 'editor', 'viewer']).transform(val => {
      if (val === 'admin') return 'ADMIN';
      if (val === 'editor') return 'MEMBER';
      return 'VIEWER';
    }),
  ).optional(),
  active: z.boolean().optional(),
});

// PATCH /api/settings/users/:id
router.patch('/users/:id', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;
    const input = UpdateUserSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.active !== undefined ? { isActive: input.active } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ message: 'Usuário atualizado com sucesso', user: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/settings/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;

    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/costs (Usage stats & estimated API costs)
router.get('/costs', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const [totalLeads, totalReports] = await Promise.all([
      prisma.business.count({ where: { tenantId } }),
      prisma.businessReport.count({ where: { business: { tenantId } } }),
    ]);

    // Estimated costs (Google Places ~$0.017, OpenAI GPT-4o-mini ~$0.002, Serper ~$0.001)
    const googlePlacesCost = totalLeads * 0.017;
    const aiReviewCost = totalReports * 0.002;
    const serperCost = totalReports * 0.001;
    const totalEstimatedUsd = googlePlacesCost + aiReviewCost + serperCost;

    res.json({
      usage: {
        totalLeadsSearched: totalLeads,
        totalEnrichmentsRun: totalReports,
      },
      costs: {
        googlePlacesUsd: parseFloat(googlePlacesCost.toFixed(3)),
        aiReviewUsd: parseFloat(aiReviewCost.toFixed(3)),
        serperUsd: parseFloat(serperCost.toFixed(3)),
        totalEstimatedUsd: parseFloat(totalEstimatedUsd.toFixed(3)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
