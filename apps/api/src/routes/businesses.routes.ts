import { Router } from 'express';
import { z } from 'zod';
import type { SignalType } from '@tzolkin/database';
import {
  prisma,
  listTenantBusinesses,
  aggregateNicheSignal,
  tenantServiceProfile,
} from '@tzolkin/database';
import {
  SignalService,
  DiagnosticService,
  OutboundPatternIntelligenceService,
  combineRelevance,
  matchNeedsToProvider,
  ALL_STATIC_SIGNALS,
} from '@tzolkin/core';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const signalService = new SignalService(process.env.OPENAI_API_KEY);
const diagnosticService = new DiagnosticService();
const outboundIntelligenceService = new OutboundPatternIntelligenceService();

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

// GET /api/businesses/matched
// Os negócios que precisam do que ESTE prestador vende, com a cadeia de
// evidência de cada encaixe.
//
// É o fecho da corrente: perfil (nicho + profissão) → sinal relevante →
// necessidade inferida por regra → encaixe com a oferta. Nada aqui é
// adjetivo de venda: cada linha carrega os sinais que a sustentam.
router.get('/matched', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const profile = await tenantServiceProfile(tenantId);
    const sells = profile.services.map((s) => s.slug);

    const businesses = await prisma.business.findMany({
      where: { tenantId, canonicalId: { not: null } },
      select: { id: true, name: true, category: true, canonicalId: true },
    });

    const canonicalIds = businesses
      .map((b) => b.canonicalId)
      .filter((id): id is string => id !== null);

    const signals =
      canonicalIds.length > 0
        ? await prisma.signal.findMany({
            where: { canonicalId: { in: canonicalIds } },
            select: { canonicalId: true, type: true, observedAt: true },
            orderBy: { observedAt: 'desc' },
          })
        : [];

    const signalsByCanonical = new Map<string, SignalType[]>();
    for (const s of signals) {
      const list = signalsByCanonical.get(s.canonicalId) ?? [];
      if (!list.includes(s.type)) list.push(s.type);
      signalsByCanonical.set(s.canonicalId, list);
    }

    const evaluated = businesses.map((b) => {
      const businessSignals = b.canonicalId
        ? (signalsByCanonical.get(b.canonicalId) ?? [])
        : [];
      const match = matchNeedsToProvider({
        signals: businessSignals,
        providerSubcategorySlugs: sells,
      });
      return { business: b, signals: businessSignals, match };
    });

    // Só entra na lista quem tem encaixe de verdade. Quem precisa de outra
    // coisa vai para um balde separado — dizer isso é mais útil que esconder.
    const matched = evaluated
      .filter((e) => e.match.matched.length > 0)
      .sort((a, b) => {
        const w = { INVESTIMENTO_COM_LACUNA: 3, SATURACAO: 2, AUSENCIA: 1 } as const;
        const aw = a.match.strongestMechanism ? w[a.match.strongestMechanism] : 0;
        const bw = b.match.strongestMechanism ? w[b.match.strongestMechanism] : 0;
        return bw - aw || b.match.matched.length - a.match.matched.length;
      })
      .map((e) => ({
        businessId: e.business.id,
        name: e.business.name,
        category: e.business.category,
        strongestMechanism: e.match.strongestMechanism,
        needs: e.match.matched,
      }));

    const needsOtherService = evaluated
      .filter((e) => e.match.needsOtherService)
      .map((e) => ({
        businessId: e.business.id,
        name: e.business.name,
        // Dedup: duas regras diferentes podem apontar o mesmo serviço (ex.
        // "tem site e não anuncia" + "audiência orgânica sem anúncio" → ambas
        // trafego-pago). Aqui interessa o serviço, não quantas regras bateram.
        needs: [...new Set(e.match.unmatched.map((u) => u.needsSubcategorySlug))],
      }));

    res.json({
      profileConfigured: sells.length > 0,
      sells,
      matched,
      needsOtherService,
      totalEvaluated: evaluated.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/businesses/niche-signal (or /api/v1/businesses/niche-signal)
// Sinal por categoria, filtrado pela ESPECIALIDADE do usuário — um designer
// não recebe a mesma coisa que quem vende site. Esta rota é o ponto de
// composição: lê o perfil, traduz para sinal relevante via core, e passa a
// lista pronta para a camada de dados (que não conhece especialidade).
router.get('/niche-signal', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { specialties: true, specialtyOther: true },
    });

    const specialties = tenant?.specialties ?? [];
    const relevance = combineRelevance(specialties);

    const result = await aggregateNicheSignal(tenantId, { 
      signalTypes: relevance.all,
      excludeStaticTypes: ALL_STATIC_SIGNALS,
    });

    res.json({
      ...result,
      // O cliente precisa distinguir "não configurou perfil" de "configurou e
      // não temos sinal pra isso" — são estados diferentes com respostas
      // diferentes, e nenhum dos dois deve virar um número silencioso.
      profileConfigured: specialties.length > 0,
      specialties,
      relevance: {
        primary: relevance.primary,
        secondary: relevance.secondary,
        noPrimaryCoverage: relevance.noPrimaryCoverage,
        gaps: relevance.gaps,
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

// POST /api/businesses/:id/analyze (or /api/v1/businesses/:id/analyze)
// Roda o motor real de diff → sinal → diagnóstico sobre o negócio canônico
// ligado a este Business. Não fabrica nada: se não há canonicalId ou não há
// observação suficiente, os arrays/campos voltam vazios/neutros — nunca
// preenchidos com placeholder que pareça dado.
router.post('/:id/analyze', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;

    const business = await prisma.business.findFirst({ where: { id, tenantId } });
    if (!business) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    if (!business.canonicalId) {
      res.status(409).json({
        error: 'Este negócio ainda não está ligado à base canônica — refaça a busca para vincular.',
      });
      return;
    }

    const [signals, diagnosis] = await Promise.all([
      signalService.evaluateSignals(business.canonicalId),
      diagnosticService.generateDiagnosis(business.canonicalId),
    ]);

    res.json({ signals, diagnosis });
  } catch (error) {
    next(error);
  }
});

const AuditPitchSchema = z.object({
  pitchText: z.string(),
  niche: z.string().optional(),
});

// POST /api/businesses/:id/audit-pitch (or /api/v1/businesses/:id/audit-pitch)
// Audita uma minuta de pitch contra o Cérebro Global de padrões de outbound
// real (OutboundPatternIntelligence). benchmarkResponseRate vem null quando
// não há amostra — nunca um número de preenchimento.
router.post('/:id/audit-pitch', async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id;
    const { pitchText, niche } = AuditPitchSchema.parse(req.body);

    const business = await prisma.business.findFirst({ where: { id, tenantId } });
    if (!business) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    let hasAds = false;
    if (business.canonicalId) {
      const adSignal = await prisma.signal.findFirst({
        where: {
          canonicalId: business.canonicalId,
          type: { in: ['COMECOU_A_ANUNCIAR', 'AUMENTOU_CRIATIVOS', 'PAROU_DE_ANUNCIAR'] },
        },
        orderBy: { observedAt: 'desc' },
      });
      hasAds = adSignal?.type === 'COMECOU_A_ANUNCIAR' || adSignal?.type === 'AUMENTOU_CRIATIVOS';
    }

    const resolvedNiche = niche ?? tenant?.icpNiche ?? undefined;
    const result = await outboundIntelligenceService.auditPitch(pitchText, {
      ...(resolvedNiche ? { niche: resolvedNiche } : {}),
      hasWebsite: business.hasWebsite,
      hasAds,
    });

    res.json(result);
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
