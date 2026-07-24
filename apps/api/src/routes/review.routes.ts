import { Router } from 'express';
import { prisma, Prisma } from '@tzolkin/database';
import { ReviewPipeline, type Business, AdsAuditTool, MetaAdsTool, SerperClient } from '@tzolkin/core';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createRateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import { env } from '../config/env.js';

const router: Router = Router();

router.use(authMiddleware);

const reviewRateLimit = createRateLimitMiddleware(
  { windowSeconds: 60, maxRequests: 30, keyPrefix: 'review' },
  env.REDIS_URL,
);

const reviewAllRateLimit = createRateLimitMiddleware(
  { windowSeconds: 60 * 60, maxRequests: 5, keyPrefix: 'review-all' },
  env.REDIS_URL,
);

// Helper to get initialized ReviewPipeline with environment secrets and tenant config
async function getPipelineForTenant(tenantId: string): Promise<ReviewPipeline> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      icpNiche: true,
      icpRegion: true,
      icpDecisionMaker: true,
      icpPainPoints: true,
      valuePropHeadline: true,
      valuePropServices: true,
      valuePropDifferentials: true,
      selectedAiModel: true,
    },
  });

  return new ReviewPipeline({
    serperApiKey: env.SERPER_API_KEY,
    metaAdsAccessToken: env.META_ADS_TOKEN,
    apifyApiToken: env.APIFY_API_TOKEN,
    openAiApiKey: env.OPENAI_API_KEY,
    scrapingBeeApiKey: env.SCRAPINGBEE_API_KEY,
    redisUrl: env.REDIS_URL,
    cacheTtlSeconds: env.REDIS_CACHE_TTL_SECONDS,
    modelName: tenant?.selectedAiModel ?? undefined,
    icpContext: tenant ? {
      niche: tenant.icpNiche ?? undefined,
      region: tenant.icpRegion ?? undefined,
      decisionMaker: tenant.icpDecisionMaker ?? undefined,
      painPoints: tenant.icpPainPoints ?? undefined,
    } : undefined,
    valuePropContext: tenant ? {
      headline: tenant.valuePropHeadline ?? undefined,
      services: tenant.valuePropServices ?? undefined,
      differentials: tenant.valuePropDifferentials ?? undefined,
    } : undefined,
  });
}

// POST /api/v1/review/:id & /api/search/review/:id - Run unified ReviewPipeline on a specific business lead
router.post(['/review/:id', '/search/review/:id'], reviewRateLimit, async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const businessId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, tenantId },
      include: { report: true },
    });

    if (!business) {
      res.status(404).json({ error: 'Lead não encontrado para este tenant' });
      return;
    }

    const pipeline = await getPipelineForTenant(tenantId);
    const coreBusiness: Business = {
      placeId: business.placeId,
      name: business.name,
      address: business.address ?? '',
      phone: business.phone,
      category: business.category,
      rating: business.rating,
      reviewCount: business.reviewCount,
      hasWebsite: business.hasWebsite,
      websiteUrl: business.websiteUrl,
      googleMapsUrl: business.googleMapsUrl,
      latitude: business.latitude,
      longitude: business.longitude,
      photoResourceNames: business.photos,
      openingHours: business.openingHours,
    };

    const enrichmentResult = await pipeline.run({ business: coreBusiness });

    // Update business record with website and CNPJ data discovered during enrichment
    const businessUpdateData: Parameters<typeof prisma.business.update>[0]['data'] = {
      ...(enrichmentResult.business.hasWebsite !== business.hasWebsite && {
        hasWebsite: enrichmentResult.business.hasWebsite,
        websiteUrl: enrichmentResult.business.websiteUrl,
      }),
      ...(enrichmentResult.business.cnpj !== undefined && enrichmentResult.business.cnpj !== null && {
        cnpj: enrichmentResult.business.cnpj,
      }),
      ...(enrichmentResult.business.razaoSocial !== undefined && { razaoSocial: enrichmentResult.business.razaoSocial }),
      ...(enrichmentResult.business.nomeFantasia !== undefined && { nomeFantasia: enrichmentResult.business.nomeFantasia }),
      ...(enrichmentResult.business.situacaoCadastral !== undefined && { situacaoCadastral: enrichmentResult.business.situacaoCadastral }),
      ...(enrichmentResult.business.dataInicioAtividade !== undefined && { dataInicioAtividade: enrichmentResult.business.dataInicioAtividade }),
      ...(enrichmentResult.business.cnaeDescricao !== undefined && { cnaeDescricao: enrichmentResult.business.cnaeDescricao }),
      ...(enrichmentResult.business.capitalSocial !== undefined && { capitalSocial: enrichmentResult.business.capitalSocial }),
    };

    if (Object.keys(businessUpdateData).length > 0) {
      await prisma.business.update({
        where: { id: business.id },
        data: businessUpdateData,
      });
    }

    // Save or update BusinessReport in database
    const reportData = {
      instagramUrl: enrichmentResult.instagram.url,
      instagramBio: enrichmentResult.instagram.bio,
      instagramFollowers: enrichmentResult.instagram.followers,
      instagramPosts: enrichmentResult.instagram.posts,
      profilePicUrl: enrichmentResult.instagram.profilePicUrl,
      brandColors: enrichmentResult.aiReview.visualIdentitySuggestions?.colors ?? [],
      visualIdentityNotes: enrichmentResult.aiReview.visualIdentitySuggestions
        ? `Estilo: ${enrichmentResult.aiReview.visualIdentitySuggestions.style} | Tom: ${enrichmentResult.aiReview.visualIdentitySuggestions.tone}`
        : null,
      aiAnalysis: {
        ...enrichmentResult.aiReview,
        metaAds: enrichmentResult.metaAds,
        extraLinks: enrichmentResult.instagram.extraLinks,
        enrichment: {
          tiktokUrl: enrichmentResult.tiktokUrl,
          linkedinUrl: enrichmentResult.linkedinUrl,
        },
      },
      ...(enrichmentResult.cnpj ? { cnpjAnalysis: enrichmentResult.cnpj.raw as unknown as Prisma.InputJsonValue } : {}),
      ...(enrichmentResult.adsAudit
        ? { adsAuditAnalysis: enrichmentResult.adsAudit as any }
        : {}),
      suitabilityScore: enrichmentResult.aiReview.suitabilityScore,
      aiSummary: enrichmentResult.aiReview.summary,
      approachSuggestion: enrichmentResult.aiReview.approachSuggestion,
      websiteScreenshotUrl: enrichmentResult.scrapes?.websiteScreenshotUrl,
      instagramScreenshotUrl: enrichmentResult.scrapes?.instagramScreenshotUrl,
      scrapedCodeUrl: enrichmentResult.scrapes?.scrapedCodeUrl,
      status: 'REVIEWED' as const,
    };

    const report = await prisma.businessReport.upsert({
      where: { businessId: business.id },
      update: reportData,
      create: {
        businessId: business.id,
        ...reportData,
      },
    });

    const updated = await prisma.business.findUnique({
      where: { id: business.id },
      include: { report: true },
    });

    res.json({
      message: `Enriquecimento concluído para ${business.name}`,
      report,
      business: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/audit-ads/:id - Real-time ads audit (Meta + Google + TikTok) with commercial diagnosis
router.post('/audit-ads/:id', reviewRateLimit, async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;
    const businessId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, tenantId },
    });

    if (!business) {
      res.status(404).json({ error: 'Lead não encontrado para este tenant' });
      return;
    }

    const serperClient = new SerperClient({ apiKey: env.SERPER_API_KEY });
    const metaAdsTool = new MetaAdsTool(env.META_ADS_TOKEN, serperClient);
    const adsAuditTool = new AdsAuditTool(env.OPENAI_API_KEY);

    const metaAdsResult = await metaAdsTool.execute({
      businessName: business.name,
      ...(business.websiteUrl ? {} : {}),
    });

    const metaAds = metaAdsResult.success && metaAdsResult.data ? metaAdsResult.data : null;

    const adsAuditResult = await adsAuditTool.execute({
      businessName: business.name,
      hasWebsite: business.hasWebsite,
      ...(business.websiteUrl ? { websiteUrl: business.websiteUrl } : {}),
      ...(metaAds
        ? {
            metaAds: {
              hasAds: metaAds.hasAds,
              count: metaAds.count,
              adsLibraryUrl: metaAds.adsLibraryUrl,
            },
            googleAds: metaAds.googleAds,
            tiktokAds: metaAds.tiktokAds,
          }
        : {}),
    });

    if (!adsAuditResult.success || !adsAuditResult.data) {
      res.status(502).json({ error: 'Falha ao gerar auditoria de ads', message: adsAuditResult.error });
      return;
    }

    // Persist ads audit on existing report if any
    const existingReport = await prisma.businessReport.findUnique({
      where: { businessId: business.id },
    });

    if (existingReport) {
      await prisma.businessReport.update({
        where: { businessId: business.id },
        data: {
          adsAuditAnalysis: adsAuditResult.data as any,
        },
      });
    }

    res.json({
      message: `Auditoria de ads concluída para ${business.name}`,
      adsAudit: adsAuditResult.data,
      metaAds,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/review-all - Batch review up to 10 pending leads for tenant
router.post('/review-all', reviewAllRateLimit, async (req, res, next) => {
  try {
    const tenantId = req.user!.tenantId;

    const businesses = await prisma.business.findMany({
      where: { tenantId, report: null },
      take: 10,
    });

    if (businesses.length === 0) {
      res.json({ message: 'Nenhum lead pendente de análise', reviewedCount: 0 });
      return;
    }

    const pipeline = await getPipelineForTenant(tenantId);
    const batchResults = [];

    for (const biz of businesses) {
      try {
        const coreBusiness: Business = {
          placeId: biz.placeId,
          name: biz.name,
          address: biz.address ?? '',
          phone: biz.phone,
          category: biz.category,
          rating: biz.rating,
          reviewCount: biz.reviewCount,
          hasWebsite: biz.hasWebsite,
          websiteUrl: biz.websiteUrl,
          googleMapsUrl: biz.googleMapsUrl,
          latitude: biz.latitude,
          longitude: biz.longitude,
          photoResourceNames: biz.photos,
          openingHours: biz.openingHours,
        };

        const result = await pipeline.run({ business: coreBusiness });

        const batchUpdateData: Parameters<typeof prisma.business.update>[0]['data'] = {
          ...(result.business.hasWebsite !== biz.hasWebsite && {
            hasWebsite: result.business.hasWebsite,
            websiteUrl: result.business.websiteUrl,
          }),
          ...(result.business.cnpj !== undefined && result.business.cnpj !== null && {
            cnpj: result.business.cnpj,
          }),
          ...(result.business.razaoSocial !== undefined && { razaoSocial: result.business.razaoSocial }),
          ...(result.business.nomeFantasia !== undefined && { nomeFantasia: result.business.nomeFantasia }),
          ...(result.business.situacaoCadastral !== undefined && { situacaoCadastral: result.business.situacaoCadastral }),
          ...(result.business.dataInicioAtividade !== undefined && { dataInicioAtividade: result.business.dataInicioAtividade }),
          ...(result.business.cnaeDescricao !== undefined && { cnaeDescricao: result.business.cnaeDescricao }),
          ...(result.business.capitalSocial !== undefined && { capitalSocial: result.business.capitalSocial }),
        };

        if (Object.keys(batchUpdateData).length > 0) {
          await prisma.business.update({
            where: { id: biz.id },
            data: batchUpdateData,
          });
        }

        await prisma.businessReport.create({
          data: {
            businessId: biz.id,
            instagramUrl: result.instagram.url,
            instagramBio: result.instagram.bio,
            instagramFollowers: result.instagram.followers,
            instagramPosts: result.instagram.posts,
            profilePicUrl: result.instagram.profilePicUrl,
            brandColors: result.aiReview.visualIdentitySuggestions?.colors ?? [],
            aiAnalysis: {
              ...result.aiReview,
              metaAds: result.metaAds,
              extraLinks: result.instagram.extraLinks,
            },
            ...(result.cnpj ? { cnpjAnalysis: result.cnpj.raw as unknown as Prisma.InputJsonValue } : {}),
            ...(result.adsAudit
              ? { adsAuditAnalysis: result.adsAudit as any }
              : {}),
            suitabilityScore: result.aiReview.suitabilityScore,
            aiSummary: result.aiReview.summary,
            approachSuggestion: result.aiReview.approachSuggestion,
            websiteScreenshotUrl: result.scrapes?.websiteScreenshotUrl,
            instagramScreenshotUrl: result.scrapes?.instagramScreenshotUrl,
            scrapedCodeUrl: result.scrapes?.scrapedCodeUrl,
            status: 'REVIEWED',
          },
        });

        batchResults.push({ id: biz.id, name: biz.name, score: result.aiReview.suitabilityScore, success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        batchResults.push({ id: biz.id, name: biz.name, success: false, error: message });
      }
    }

    res.json({
      message: 'Análise em lote concluída',
      totalPending: businesses.length,
      successCount: batchResults.filter(r => r.success).length,
      results: batchResults,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
