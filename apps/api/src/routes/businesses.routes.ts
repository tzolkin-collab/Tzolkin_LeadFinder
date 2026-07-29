import { Router } from 'express';
import { z } from 'zod';
import { prisma, listTenantBusinesses } from '@tzolkin/database';
import { SignalService, DiagnosticService, OutboundPatternIntelligenceService } from '@tzolkin/core';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const signalService = new SignalService();
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
