const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { searchBusinessesWithoutWebsite, getPhotoUrl } = require('../services/google-places');
const { analyzeBusiness } = require('../services/ai-review');
const { findInstagramProfile } = require('../services/instagram');
const { checkActiveAds } = require('../services/meta-ads');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// POST /api/search - Search for businesses without website
router.post('/', async (req, res, next) => {
    try {
        const { query, location, radius } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query de busca é obrigatória' });
        }

        console.log(`[Search] Searching: "${query}" near ${location ? JSON.stringify(location) : 'anywhere'}`);

        const results = await searchBusinessesWithoutWebsite(query, location, radius);

        // Save businesses to database (upsert to avoid duplicates)
        const saved = [];
        for (const biz of results.businesses) {
            const business = await prisma.business.upsert({
                where: { placeId: biz.placeId },
                update: {
                    name: biz.name,
                    address: biz.address,
                    phone: biz.phone,
                    category: biz.category,
                    rating: biz.rating,
                    reviewCount: biz.reviewCount,
                    hasWebsite: biz.hasWebsite,
                    websiteUrl: biz.websiteUrl,
                    googleMapsUrl: biz.googleMapsUrl,
                    latitude: biz.latitude,
                    longitude: biz.longitude,
                    photos: biz.photos.map(p => getPhotoUrl(p)),
                    openingHours: biz.openingHours,
                    searchQuery: query,
                },
                create: {
                    placeId: biz.placeId,
                    name: biz.name,
                    address: biz.address,
                    phone: biz.phone,
                    category: biz.category,
                    rating: biz.rating,
                    reviewCount: biz.reviewCount,
                    hasWebsite: biz.hasWebsite,
                    websiteUrl: biz.websiteUrl,
                    googleMapsUrl: biz.googleMapsUrl,
                    latitude: biz.latitude,
                    longitude: biz.longitude,
                    photos: biz.photos.map(p => getPhotoUrl(p)),
                    openingHours: biz.openingHours,
                    searchQuery: query,
                },
                include: { report: true },
            });
            saved.push(business);
        }

        res.json({
            message: `Busca concluída: ${results.total} encontrados, ${results.withoutWebsite} sem website`,
            totalFound: results.total,
            withoutWebsite: results.withoutWebsite,
            savedCount: saved.length,
            businesses: saved,
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/search/review/:id - Run AI review on a specific business
router.post('/review/:id', async (req, res, next) => {
    try {
        const business = await prisma.business.findUnique({
            where: { id: req.params.id },
            include: { report: true },
        });

        if (!business) {
            return res.status(404).json({ error: 'Negócio não encontrado' });
        }

        console.log(`[Review] Starting review for: ${business.name}`);

        // Step 1: Find Instagram profile
        console.log(`[Review] Searching Instagram for: ${business.name}`);
        const instagramData = await findInstagramProfile(business.name, business.address);

        // Update business if a website was found on Instagram that Google missed
        if (instagramData?.website && !business.hasWebsite) {
            console.log(`[Review] Found new website on Instagram: ${instagramData.website}`);
            await prisma.business.update({
                where: { id: business.id },
                data: {
                    hasWebsite: true,
                    websiteUrl: instagramData.website,
                }
            });
        }

        // Step 2: Check Meta Ads
        console.log(`[Review] Checking Meta Ads for: ${business.name}`);
        const adsData = await checkActiveAds(business.name);

        // Step 3: Run AI analysis
        console.log(`[Review] Running AI analysis for: ${business.name}`);
        const aiResult = await analyzeBusiness(business, instagramData);

        // Step 4: Add enrichment data to AI analysis object
        if (aiResult.fullAnalysis) {
            aiResult.fullAnalysis.enrichment = {
                hasAds: adsData.hasAds,
                adsCount: adsData.count,
                externalLinks: instagramData?.extraLinks || null,
            };
        }

        // Step 5: Save report to database
        const reportData = {
            // Instagram
            instagramUrl: instagramData?.url || null,
            instagramBio: instagramData?.bio || null,
            instagramFollowers: instagramData?.followers || null,
            instagramPosts: instagramData?.posts || null,
            profilePicUrl: instagramData?.profilePicUrl || null,

            // Visual identity from AI
            logoUrl: null,
            brandColors: aiResult.fullAnalysis?.visualIdentitySuggestions?.colors || null,
            visualIdentityNotes: aiResult.fullAnalysis?.visualIdentitySuggestions
                ? `Estilo: ${aiResult.fullAnalysis.visualIdentitySuggestions.style || 'N/A'} | Tom: ${aiResult.fullAnalysis.visualIdentitySuggestions.tone || 'N/A'}`
                : null,

            // AI analysis (including enrichment)
            aiAnalysis: aiResult.fullAnalysis,
            suitabilityScore: aiResult.suitabilityScore,
            aiSummary: aiResult.summary,
            approachSuggestion: aiResult.approachSuggestion,

            // Status
            status: 'PENDING',
        };

        let report;
        if (business.report) {
            report = await prisma.businessReport.update({
                where: { businessId: business.id },
                data: reportData,
            });
        } else {
            report = await prisma.businessReport.create({
                data: {
                    businessId: business.id,
                    ...reportData,
                },
            });
        }

        // Return full business with report
        const updated = await prisma.business.findUnique({
            where: { id: business.id },
            include: { report: true },
        });

        console.log(`[Review] Completed for: ${business.name} (Score: ${aiResult.suitabilityScore}/10)`);

        res.json({
            message: `Análise concluída para ${business.name}`,
            business: updated,
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/search/review-all - Review all businesses without reports
router.post('/review-all', async (req, res, next) => {
    try {
        const businesses = await prisma.business.findMany({
            where: { report: null },
            take: 10, // Limit to 10 at a time to avoid API overload
        });

        if (businesses.length === 0) {
            return res.json({ message: 'Nenhum negócio pendente de análise', reviewed: 0 });
        }

        console.log(`[Review] Starting batch review for ${businesses.length} businesses`);

        const results = [];
        for (const business of businesses) {
            try {
                const instagramData = await findInstagramProfile(business.name, business.address);

                // Update business if a website was found on Instagram that Google missed
                if (instagramData?.website && !business.hasWebsite) {
                    console.log(`[Review-Batch] Found new website for ${business.name}: ${instagramData.website}`);
                    await prisma.business.update({
                        where: { id: business.id },
                        data: {
                            hasWebsite: true,
                            websiteUrl: instagramData.website,
                        }
                    });
                }

                // Check Meta Ads
                const adsData = await checkActiveAds(business.name);

                const aiResult = await analyzeBusiness(business, instagramData);

                // Add enrichment data
                if (aiResult.fullAnalysis) {
                    aiResult.fullAnalysis.enrichment = {
                        hasAds: adsData.hasAds,
                        adsCount: adsData.count,
                        externalLinks: instagramData?.extraLinks || null,
                    };
                }

                await prisma.businessReport.create({
                    data: {
                        businessId: business.id,
                        instagramUrl: instagramData?.url || null,
                        instagramBio: instagramData?.bio || null,
                        instagramFollowers: instagramData?.followers || null,
                        instagramPosts: instagramData?.posts || null,
                        profilePicUrl: instagramData?.profilePicUrl || null,
                        brandColors: aiResult.fullAnalysis?.visualIdentitySuggestions?.colors || null,
                        aiAnalysis: aiResult.fullAnalysis,
                        suitabilityScore: aiResult.suitabilityScore,
                        aiSummary: aiResult.summary,
                        approachSuggestion: aiResult.approachSuggestion,
                        status: 'PENDING',
                    },
                });

                results.push({ id: business.id, name: business.name, score: aiResult.suitabilityScore, success: true });
                console.log(`[Review] ✓ ${business.name} (Score: ${aiResult.suitabilityScore})`);

            } catch (err) {
                results.push({ id: business.id, name: business.name, success: false, error: err.message });
                console.error(`[Review] ✗ ${business.name}: ${err.message}`);
            }
        }

        res.json({
            message: `Análise em lote concluída`,
            total: businesses.length,
            reviewed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
