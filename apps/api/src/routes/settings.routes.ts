import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@tzolkin/database';
import { authMiddleware, type UserPayload } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authMiddleware);

// Authorization helper for role-restricted endpoints.
function requireRole(...allowed: UserPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ error: 'Permissão insuficiente' });
      return;
    }
    next();
  };
}

function generateSecurePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ─── 1. PROFILE (USER DETAILS & PASSWORD) ──────────────────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

const ProfileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

router.patch('/profile', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const input = ProfileUpdateSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    let passwordHash = user.passwordHash;
    if (input.newPassword) {
      if (!input.currentPassword) {
        res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
        return;
      }
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        res.status(400).json({ error: 'Senha atual incorreta' });
        return;
      }
      passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.json({ message: 'Perfil atualizado com sucesso', user: updated });
  } catch (error) {
    next(error);
  }
});

// ─── 2. GENERAL (TENANT NAME, ICP & AI MODEL) ──────────────────────────────
router.get('/general', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        targetIcp: true,
        selectedAiModel: true,
        subscriptionPlan: true,
      },
    });

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

const GeneralUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  targetIcp: z.string().optional(),
  selectedAiModel: z.enum(['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet']).optional(),
});

router.patch('/general', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const input = GeneralUpdateSchema.parse(req.body);

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.targetIcp !== undefined ? { targetIcp: input.targetIcp } : {}),
        ...(input.selectedAiModel ? { selectedAiModel: input.selectedAiModel } : {}),
      },
    });

    res.json({ message: 'Configurações gerais salvas com sucesso', tenant: updated });
  } catch (error) {
    next(error);
  }
});

// ─── 3. PLANS & UPGRADE (CLAUDE-STYLE PRICING CARDS) ──────────────────────
router.get('/plans', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    const currentPlan = tenant?.subscriptionPlan || 'starter';

    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        tagline: 'Ideal para prospecção inicial e testes de mercado',
        priceMonthlyUsd: 0,
        priceMonthlyBrl: 0,
        features: [
          'Até 100 pesquisas de leads/mês (Google Places)',
          'Enriquecimento com IA (GPT-4o-mini)',
          'Verificação de Instagram & Meta Ads',
          'Até 2 membros na equipe',
          'Suporte por e-mail',
        ],
        popular: false,
        checkoutUrl: null,
      },
      {
        id: 'pro',
        name: 'Pro Multi-Tenant',
        tagline: 'Para agências e equipes comerciais ativas',
        priceMonthlyUsd: 49,
        priceMonthlyBrl: 249,
        features: [
          'Pesquisas de leads ilimitadas',
          'Escolha do modelo de IA (GPT-4o / Claude 3.5)',
          'ICP customizado avançado',
          'Até 10 membros na equipe',
          'Integrações com WhatsApp & Webhooks',
          'Suporte prioritário via WhatsApp Tzolkin',
        ],
        popular: true,
        checkoutUrl: 'https://stripe.com/checkout/link-pro-tzolkin',
      },
    ];

    res.json({ currentPlan, plans });
  } catch (error) {
    next(error);
  }
});

// ─── 4. REVISED COSTS & USAGE TRANSPARENCY ─────────────────────────────────
router.get('/costs', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const [totalLeads, totalReports, websiteCount] = await Promise.all([
      prisma.business.count({ where: { tenantId } }),
      prisma.businessReport.count({ where: { business: { tenantId } } }),
      prisma.business.count({ where: { tenantId, hasWebsite: true } }),
    ]);

    const googlePlacesCost = totalLeads * 0.017;
    const serperCost = totalReports * 0.001; // Serper API handles both Instagram Profiling & Meta Ads Library search
    const aiReviewCost = totalReports * 0.002;
    const totalCostUsd = googlePlacesCost + serperCost + aiReviewCost;

    res.json({
      totalCostUSD: parseFloat(totalCostUsd.toFixed(3)),
      usage: {
        totalLeadsSearched: totalLeads,
        totalEnrichmentsRun: totalReports,
        leadsWithoutWebsite: totalLeads - websiteCount,
      },
      costs: {
        googlePlaces: {
          label: 'Google Places Tool (Varredura de Leads)',
          count: totalLeads,
          costPerUnit: 0.017,
          totalCost: parseFloat(googlePlacesCost.toFixed(3)),
        },
        serperEnrichment: {
          label: 'Serper API (Instagram Profiling & Meta Ads)',
          count: totalReports,
          costPerUnit: 0.001,
          totalCost: parseFloat(serperCost.toFixed(3)),
        },
        openAi: {
          label: 'OpenAI GPT-4o-mini (Dossiê & Score)',
          count: totalReports,
          costPerUnit: 0.002,
          totalCost: parseFloat(aiReviewCost.toFixed(3)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── 5. TEAM & USERS MANAGEMENT ────────────────────────────────────────────
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
  password: z.string().min(8).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).or(
    z.enum(['admin', 'editor', 'viewer']).transform(val => {
      if (val === 'admin') return 'ADMIN';
      if (val === 'editor') return 'MEMBER';
      return 'VIEWER';
    }),
  ).default('MEMBER'),
});

router.post('/users', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const currentRole = req.user!.role;
    const input = CreateUserSchema.parse(req.body);

    if (input.role === 'OWNER' && currentRole !== 'OWNER') {
      res.status(403).json({ error: 'Apenas Owner pode criar outros Owner' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { tenantId, email: input.email },
    });

    if (existing) {
      res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
      return;
    }

    const plainPassword = input.password || generateSecurePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.json({
      message: 'Usuário criado com sucesso',
      user,
      password: input.password ? undefined : plainPassword,
    });
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

router.patch('/users/:id', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const currentUserId = req.user!.userId;
    const currentRole = req.user!.role;
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    const input = UpdateUserSchema.parse(req.body);

    if (id === currentUserId) {
      res.status(400).json({ error: 'Não é possível alterar o próprio usuário por aqui' });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    if (user.role === 'OWNER' && currentRole !== 'OWNER') {
      res.status(403).json({ error: 'Apenas Owner pode alterar outro Owner' });
      return;
    }

    if (input.role === 'OWNER' && currentRole !== 'OWNER') {
      res.status(403).json({ error: 'Apenas Owner pode promover a Owner' });
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
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.json({ message: 'Usuário atualizado com sucesso', user: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const currentUserId = req.user!.userId;
    const currentRole = req.user!.role;
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (id === currentUserId) {
      res.status(400).json({ error: 'Não é possível remover o próprio usuário' });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    if (user.role === 'OWNER' && currentRole !== 'OWNER') {
      res.status(403).json({ error: 'Apenas Owner pode remover outro Owner' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    next(error);
  }
});

export default router;
