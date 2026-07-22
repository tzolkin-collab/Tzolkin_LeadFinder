import type { Business } from '../tools/google-places.tool.js';
import { InstagramTool, type InstagramProfile } from '../tools/instagram.tool.js';
import { MetaAdsTool, type MetaAdsOutput } from '../tools/meta-ads.tool.js';
import { AiReviewTool, type AiReviewOutput } from '../tools/ai-review.tool.js';

export interface ReviewPipelineConfig {
  serperApiKey?: string | undefined;
  metaAdsAccessToken?: string | undefined;
  openAiApiKey?: string | undefined;
}

export interface ReviewPipelineInput {
  business: Business;
}

export interface ReviewPipelineResult {
  business: Business;
  instagram: InstagramProfile;
  metaAds: MetaAdsOutput;
  aiReview: AiReviewOutput;
  reviewedAt: Date;
}

/**
 * Single Unified Review Pipeline for enriching a business lead.
 * Encapsulates Instagram discovery, Meta Ads verification, and AI analysis.
 * Eliminates duplicate enrichment code between single endpoints and batch workers.
 */
export class ReviewPipeline {
  private readonly instagramTool: InstagramTool;
  private readonly metaAdsTool: MetaAdsTool;
  private readonly aiReviewTool: AiReviewTool;

  constructor(config?: ReviewPipelineConfig) {
    const serperKey = config?.serperApiKey;
    const metaToken = config?.metaAdsAccessToken;
    const openAiKey = config?.openAiApiKey;

    this.instagramTool = new InstagramTool(serperKey);
    this.metaAdsTool = new MetaAdsTool(metaToken, serperKey);
    this.aiReviewTool = new AiReviewTool(openAiKey);
  }

  async run(input: ReviewPipelineInput): Promise<ReviewPipelineResult> {
    const { business } = input;

    // Step 1: Find Instagram Profile & Linktree Links
    const instagramResult = await this.instagramTool.execute({
      businessName: business.name,
      ...(business.address ? { location: business.address } : {}),
    });

    const instagram: InstagramProfile =
      instagramResult.success && instagramResult.data
        ? instagramResult.data
        : {
            handle: null,
            url: null,
            bio: null,
            followers: null,
            posts: null,
            profilePicUrl: null,
            website: null,
            extraLinks: null,
          };

    // If a website URL was found on Instagram that Google missed, update business record
    const updatedBusiness: Business = {
      ...business,
      hasWebsite: business.hasWebsite || !!instagram.website,
      websiteUrl: business.websiteUrl ?? instagram.website,
    };

    // Step 2: Check Meta Ads Library
    const metaAdsResult = await this.metaAdsTool.execute({
      businessName: updatedBusiness.name,
    });

    const fallbackMetaUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(updatedBusiness.name)}`;

    const metaAds: MetaAdsOutput =
      metaAdsResult.success && metaAdsResult.data
        ? metaAdsResult.data
        : {
            hasAds: false,
            count: 0,
            adsLibraryUrl: fallbackMetaUrl,
            ads: [],
            checkMethod: 'FALLBACK_LINK',
          };

    // Step 3: Run AI Structured Review
    const aiReviewResult = await this.aiReviewTool.execute({
      businessName: updatedBusiness.name,
      hasWebsite: updatedBusiness.hasWebsite,
      ...(updatedBusiness.category ? { category: updatedBusiness.category } : {}),
      ...(updatedBusiness.address ? { address: updatedBusiness.address } : {}),
      ...(updatedBusiness.phone ? { phone: updatedBusiness.phone } : {}),
      ...(updatedBusiness.rating !== null ? { rating: updatedBusiness.rating } : {}),
      ...(updatedBusiness.reviewCount !== null ? { reviewCount: updatedBusiness.reviewCount } : {}),
      ...(instagram.handle
        ? {
            instagramData: {
              handle: instagram.handle,
              ...(instagram.bio !== null ? { bio: instagram.bio } : {}),
              ...(instagram.followers !== null ? { followers: instagram.followers } : {}),
              ...(instagram.posts !== null ? { posts: instagram.posts } : {}),
            },
          }
        : {}),
      hasActiveAds: metaAds.hasAds,
    });

    const aiReview: AiReviewOutput =
      aiReviewResult.success && aiReviewResult.data
        ? aiReviewResult.data
        : {
            suitabilityScore: 5,
            summary: 'Análise automática indisponível.',
            strengths: [],
            challenges: [],
            approachSuggestion: 'Abordagem padrão.',
            estimatedBudget: 'A avaliar',
            priority: 'média',
            suggestedFeatures: [],
          };

    return {
      business: updatedBusiness,
      instagram,
      metaAds,
      aiReview,
      reviewedAt: new Date(),
    };
  }
}
