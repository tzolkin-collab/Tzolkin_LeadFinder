import { Router } from 'express';
import { prisma } from '@tzolkin/database';
import { ReviewPipeline, type Business } from '@tzolkin/core';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';

const router: Router = Router();

router.use(authMiddleware);

// Helper to get initialized ReviewPipeline with environment secrets
function getPipeline(): ReviewPipeline {
  return new ReviewPipeline({
    serperApiKey: env.SERPER_API_KEY,
    metaAdsAccessToken: env.META_ADS_TOKEN,
    openAiApiKey: env.OPENAI_API_KEY,
  });
}

// POST /api/v1/review/:id & /api/search/review/:id - Run unified ReviewPipeline on a specific business lead
router.post(['/review/:id', '/search/review/:id'], async (req, res, next) => {
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

    const pipeline = getPipeline();
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

    // Update business website if Instagram found a URL that Google missed
    if (enrichmentResult.business.hasWebsite !== business.hasWebsite) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          hasWebsite: enrichmentResult.business.hasWebsite,
          websiteUrl: enrichmentResult.business.websiteUrl,
        },
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
      },
      suitabilityScore: enrichmentResult.aiReview.suitabilityScore,
      aiSummary: enrichmentResult.aiReview.summary,
      approachSuggestion: enrichmentResult.aiReview.approachSuggestion,
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

// POST /api/v1/review-all - Batch review up to 10 pending leads for tenant
router.post('/review-all', async (req, res, next) => {
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

    const pipeline = getPipeline();
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

        if (result.business.hasWebsite !== biz.hasWebsite) {
          await prisma.business.update({
            where: { id: biz.id },
            data: {
              hasWebsite: result.business.hasWebsite,
              websiteUrl: result.business.websiteUrl,
            },
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
            suitabilityScore: result.aiReview.suitabilityScore,
            aiSummary: result.aiReview.summary,
            approachSuggestion: result.aiReview.approachSuggestion,
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
