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

// ─── 2. GENERAL (TENANT NAME, STRUCTURAL ICP, VALUE PROP & AI MODEL) ───────
router.get('/general', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        specialties: true,
        specialtyOther: true,
        icpNiche: true,
        icpRegion: true,
        icpDecisionMaker: true,
        icpPainPoints: true,
        valuePropHeadline: true,
        valuePropServices: true,
        valuePropDifferentials: true,
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
  // ⚠️ `specialties` NÃO é aceito aqui de propósito. Virou cache derivado das
  // subcategorias do tenant (ver TenantService) e só `setTenantServices()`
  // escreve, via PUT /api/taxonomy/profile. Aceitar aqui reabriria o segundo
  // caminho de escrita e o cache voltaria a divergir da relação.
  specialtyOther: z.string().optional(),
  icpNiche: z.string().optional(),
  icpRegion: z.string().optional(),
  icpDecisionMaker: z.string().optional(),
  icpPainPoints: z.string().optional(),
  valuePropHeadline: z.string().optional(),
  valuePropServices: z.string().optional(),
  valuePropDifferentials: z.string().optional(),
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
        ...(input.specialtyOther !== undefined ? { specialtyOther: input.specialtyOther } : {}),
        ...(input.icpNiche !== undefined ? { icpNiche: input.icpNiche } : {}),
        ...(input.icpRegion !== undefined ? { icpRegion: input.icpRegion } : {}),
        ...(input.icpDecisionMaker !== undefined ? { icpDecisionMaker: input.icpDecisionMaker } : {}),
        ...(input.icpPainPoints !== undefined ? { icpPainPoints: input.icpPainPoints } : {}),
        ...(input.valuePropHeadline !== undefined ? { valuePropHeadline: input.valuePropHeadline } : {}),
        ...(input.valuePropServices !== undefined ? { valuePropServices: input.valuePropServices } : {}),
        ...(input.valuePropDifferentials !== undefined ? { valuePropDifferentials: input.valuePropDifferentials } : {}),
        ...(input.selectedAiModel ? { selectedAiModel: input.selectedAiModel } : {}),
      },
    });

    res.json({ message: 'Configurações de ICP, Proposta de Valor e Modelo de IA salvas com sucesso', tenant: updated });
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

// ─── 4. PROPRIETARY TZOLKIN TOKENS & USAGE LEDGER ─────────────────────────
router.get('/costs', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionPlan: true, selectedAiModel: true },
    });

    const [totalLeads, totalReports, websiteCount] = await Promise.all([
      prisma.business.count({ where: { tenantId } }),
      prisma.businessReport.count({ where: { business: { tenantId } } }),
      prisma.business.count({ where: { tenantId, hasWebsite: true } }),
    ]);

    // Plan Monthly Tokens Quota
    const planQuotaMap: Record<string, number> = {
      starter: 5000,
      pro: 25000,
      enterprise: 100000,
    };
    const subscriptionPlan = tenant?.subscriptionPlan || 'starter';
    const monthlyPlanTokens = planQuotaMap[subscriptionPlan] || 5000;

    // Tzolkin Tokens Weighted Calculation Algorithm:
    // 1. Single-Use Search (Google Places discovery): 5 Tokens / Lead
    // 2. Multi-Use Auditing (Instagram & Meta Ads search): 15 Tokens / Audit
    // 3. Single-Use AI Dossier & Pitch (GPT-4o-mini): 20 Tokens / Dossier (or 50 Tokens for GPT-4o / Claude)
    const aiWeight = (tenant?.selectedAiModel === 'gpt-4o' || tenant?.selectedAiModel === 'claude-3-5-sonnet') ? 50 : 20;

    const searchTokens = totalLeads * 5;
    const auditTokens = totalReports * 15;
    const aiTokens = totalReports * aiWeight;

    const totalTokensUsed = searchTokens + auditTokens + aiTokens;
    const tokenBalance = Math.max(0, monthlyPlanTokens - totalTokensUsed);
    const percentUsed = Math.min(100, Math.round((totalTokensUsed / monthlyPlanTokens) * 100));

    res.json({
      tokenSystem: {
        totalTokensUsed,
        tokenBalance,
        monthlyPlanTokens,
        percentUsed,
        subscriptionPlan,
      },
      usageMetrics: {
        totalLeadsSearched: totalLeads,
        totalEnrichmentsRun: totalReports,
        leadsWithoutWebsite: totalLeads - websiteCount,
      },
      operationsBreakdown: {
        leadDiscovery: {
          label: 'Garimpo & Descoberta de Lead (Single-Use)',
          type: 'Single-Use',
          weightPerUnit: 5,
          count: totalLeads,
          tokensConsumed: searchTokens,
          unitLabel: 'leads garimpados',
        },
        multiChannelAuditing: {
          label: 'Auditoria Multi-Canal (Instagram & Meta Ads)',
          type: 'Multi-Use',
          weightPerUnit: 15,
          count: totalReports,
          tokensConsumed: auditTokens,
          unitLabel: 'leads auditados',
        },
        aiDossierGeneration: {
          label: 'Dossiê & Diagnóstico de IA Comercial',
          type: 'Single-Use',
          weightPerUnit: aiWeight,
          count: totalReports,
          tokensConsumed: aiTokens,
          unitLabel: 'dossiês gerados',
        },
      },
      weightRules: [
        { operation: 'Garimpo de PME sem Website', type: 'Single-Use', cost: '5 Tokens / Lead' },
        { operation: 'Auditoria Multi-Canal (Meta Ads + Instagram)', type: 'Multi-Use', cost: '15 Tokens / Lead' },
        { operation: 'Dossiê Comercial (GPT-4o-mini)', type: 'Single-Use', cost: '20 Tokens / Análise' },
        { operation: 'Inteligência Avançada (GPT-4o / Claude 3.5)', type: 'Multi-Use Pro', cost: '50 Tokens / Análise' },
      ],
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
