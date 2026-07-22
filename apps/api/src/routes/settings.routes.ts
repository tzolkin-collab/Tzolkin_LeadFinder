import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@tzolkin/database';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authMiddleware);

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
      {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Operações em escala com infraestrutura dedicada',
        priceMonthlyUsd: 199,
        priceMonthlyBrl: 990,
        features: [
          'Infraestrutura & Banco de dados dedicado',
          'Membros ilimitados',
          'Exportação ilimitada em tempo real',
          'API Key exclusiva com SLA de 99.9%',
          'Gerente de conta dedicado',
        ],
        popular: false,
        checkoutUrl: 'https://wa.me/5531999999999?text=Quero%20plano%20Enterprise',
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
    const instagramScrapeCost = totalReports * 0.001;
    const metaAdsCost = totalReports * 0.000;
    const aiReviewCost = totalReports * 0.002;
    const totalCostUsd = googlePlacesCost + instagramScrapeCost + metaAdsCost + aiReviewCost;

    res.json({
      totalCostUSD: parseFloat(totalCostUsd.toFixed(3)),
      usage: {
        totalLeadsSearched: totalLeads,
        totalEnrichmentsRun: totalReports,
        leadsWithoutWebsite: totalLeads - websiteCount,
      },
      costs: {
        googlePlaces: {
          label: 'Google Places Tool (Varredura)',
          count: totalLeads,
          costPerUnit: 0.017,
          totalCost: parseFloat(googlePlacesCost.toFixed(3)),
        },
        serperInstagram: {
          label: 'Serper.dev (Instagram Profiling)',
          count: totalReports,
          costPerUnit: 0.001,
          totalCost: parseFloat(instagramScrapeCost.toFixed(3)),
        },
        metaAds: {
          label: 'Meta Ads Library (Auditoria de Anúncios)',
          count: totalReports,
          costPerUnit: 0.000,
          totalCost: 0.0,
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
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).or(
    z.enum(['admin', 'editor', 'viewer']).transform(val => {
      if (val === 'admin') return 'ADMIN';
      if (val === 'editor') return 'MEMBER';
      return 'VIEWER';
    }),
  ).default('MEMBER'),
});

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
      select: { id: true, name: true, email: true, role: true, isActive: true },
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

router.patch('/users/:id', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;
    const input = UpdateUserSchema.parse(req.body);

    const user = await prisma.user.findFirst({ where: { id, tenantId } });
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
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.json({ message: 'Usuário atualizado com sucesso', user: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;

    const user = await prisma.user.findFirst({ where: { id, tenantId } });
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

export default router;
