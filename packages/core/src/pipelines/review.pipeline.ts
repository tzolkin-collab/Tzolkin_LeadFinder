import { isRealWebsiteUrl, type Business } from '../tools/google-places.tool.js';
import { InstagramTool, type InstagramProfile } from '../tools/instagram.tool.js';
import { MetaAdsTool, type MetaAdsOutput } from '../tools/meta-ads.tool.js';
import { AiReviewTool, type AiReviewOutput } from '../tools/ai-review.tool.js';
import { ScraperTool } from '../tools/scraper.tool.js';
import { DecisionMakerTool, type DecisionMakerOutput } from '../tools/decision-maker.tool.js';
import { CnpjTool, type CnpjData } from '../tools/cnpj.tool.js';
import { AdsAuditTool, type AdsAuditOutput } from '../tools/ads-audit.tool.js';
import { SerperClient } from '../clients/serper.client.js';
import {
  ApifyClient,
  type ApifyInstagramProfile,
  type ApifyTikTokProfile,
  type ApifyLinkedInCompany,
  type ApifyMetaAdsResult,
} from '../clients/apify.client.js';
import { createCacheService } from '../services/cache.service.js';
import path from 'path';
import fs from 'fs/promises';

export interface ReviewPipelineConfig {
  serperApiKey?: string | undefined;
  metaAdsAccessToken?: string | undefined;
  apifyApiToken?: string | undefined;
  openAiApiKey?: string | undefined;
  scrapingBeeApiKey?: string | undefined;
  redisUrl?: string | undefined;
  cacheTtlSeconds?: number | undefined;
  modelName?: string | undefined;
  targetIcp?: string | undefined;
  icpContext?: {
    niche?: string | undefined;
    region?: string | undefined;
    decisionMaker?: string | undefined;
    painPoints?: string | undefined;
  } | undefined;
  valuePropContext?: {
    headline?: string | undefined;
    services?: string | undefined;
    differentials?: string | undefined;
  } | undefined;
}

export interface ReviewPipelineInput {
  business: Business;
}

export interface ReviewPipelineResult {
  business: Business;
  instagram: InstagramProfile;
  metaAds: MetaAdsOutput;
  decisionMaker: DecisionMakerOutput;
  cnpj: CnpjData | null;
  adsAudit: AdsAuditOutput | null;
  aiReview: AiReviewOutput;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
  apifyData?: {
    apifyIg: ApifyInstagramProfile | null;
    apifyTikTok: ApifyTikTokProfile | null;
    apifyLinkedIn: ApifyLinkedInCompany | null;
    apifyAds: ApifyMetaAdsResult | null;
  };
  scrapes: {
    websiteScreenshotUrl: string | null;
    instagramScreenshotUrl: string | null;
    scrapedCodeUrl: string | null;
  };
  reviewedAt: Date;
}

import { CoreLogger } from '../utils/logger.js';

/**
 * Single Unified Review Pipeline for enriching a business lead.
 * Encapsulates Instagram discovery, Meta Ads verification, Decision Maker profiling, and AI analysis.
 */
export class ReviewPipeline {
  private readonly serperClient: SerperClient;
  private readonly apifyClient: ApifyClient;
  private readonly instagramTool: InstagramTool;
  private readonly metaAdsTool: MetaAdsTool;
  private readonly decisionMakerTool: DecisionMakerTool;
  private readonly cnpjTool: CnpjTool;
  private readonly adsAuditTool: AdsAuditTool;
  private readonly aiReviewTool: AiReviewTool;
  private readonly scraperTool: ScraperTool;
  private readonly targetIcp: string;
  private readonly icpContext?: ReviewPipelineConfig['icpContext'];
  private readonly valuePropContext?: ReviewPipelineConfig['valuePropContext'];
  private readonly logger = new CoreLogger('ReviewPipeline');

  constructor(config?: ReviewPipelineConfig) {
    const serperKey = config?.serperApiKey;
    const metaToken = config?.metaAdsAccessToken;
    const apifyToken = config?.apifyApiToken;
    const openAiKey = config?.openAiApiKey;
    const scrapingBeeApiKey = config?.scrapingBeeApiKey;
    const modelName = config?.modelName;
    const targetIcp = config?.targetIcp;

    const cacheService = createCacheService(config?.redisUrl);
    this.serperClient = new SerperClient({
      ...(serperKey ? { apiKey: serperKey } : {}),
      cacheService,
      ...(config?.cacheTtlSeconds ? { cacheTtlSeconds: config.cacheTtlSeconds } : {}),
    });
    this.apifyClient = new ApifyClient({ apiToken: apifyToken });

    this.instagramTool = new InstagramTool(this.serperClient);
    this.metaAdsTool = new MetaAdsTool(metaToken, this.serperClient);
    this.decisionMakerTool = new DecisionMakerTool(this.serperClient);
    this.cnpjTool = new CnpjTool(this.serperClient, cacheService);
    this.adsAuditTool = new AdsAuditTool(openAiKey, modelName);
    this.aiReviewTool = new AiReviewTool(openAiKey, modelName);
    this.scraperTool = new ScraperTool(scrapingBeeApiKey);
    this.targetIcp = targetIcp ?? '';
    this.icpContext = config?.icpContext;
    this.valuePropContext = config?.valuePropContext;
  }

  async run(input: ReviewPipelineInput): Promise<ReviewPipelineResult> {
    const startedAt = Date.now();
    const { business } = input;

    this.logger.info(`Iniciando enriquecimento de lead: "${business.name}"`, { placeId: business.placeId });

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

    // Step 1.5: If Google Places missed website, attempt Serper official domain search
    let foundWebsite = business.websiteUrl ?? instagram.website;
    if ((!foundWebsite || !isRealWebsiteUrl(foundWebsite)) && this.serperClient.isConfigured) {
      const searchRes = await this.serperClient.searchOfficialWebsite(business.name, business.address ?? undefined);
      if (searchRes && isRealWebsiteUrl(searchRes)) {
        foundWebsite = searchRes;
      }
    }

    const isRealSite = isRealWebsiteUrl(foundWebsite);
    let updatedBusiness: Business = {
      ...business,
      hasWebsite: isRealSite,
      websiteUrl: foundWebsite ?? null,
    };

    // Step 2: Web Scraping (Site & Instagram) BEFORE AI Analysis
    let websiteScreenshotUrl: string | null = null;
    let instagramScreenshotUrl: string | null = null;
    let scrapedCodeUrl: string | null = null;
    let scrapedCodeSnippet: string | undefined = undefined;

    if (updatedBusiness.websiteUrl && isRealSite) {
      const siteScrape = await this.scraperTool.scrapeWebsite(updatedBusiness.websiteUrl);
      websiteScreenshotUrl = siteScrape.screenshotUrl;
      scrapedCodeUrl = siteScrape.codeUrl;

      if (scrapedCodeUrl) {
        try {
          const fullPath = path.join(process.cwd(), 'public', scrapedCodeUrl);
          const raw = await fs.readFile(fullPath, 'utf-8');
          const json = JSON.parse(raw);
          scrapedCodeSnippet = json.rawCode ?? json.html ?? undefined;
        } catch {
          // Ignora falha de leitura do arquivo estático
        }
      }
    }

    if (instagram.handle) {
      const igScrape = await this.scraperTool.scrapeInstagramProfile(instagram.handle);
      instagramScreenshotUrl = igScrape.screenshotUrl;
    }

    // Step 3: Discover and validate CNPJ via Brasil API (free website extraction → Serper fallback)
    const cnpjResult = await this.cnpjTool.execute({
      businessName: updatedBusiness.name,
      placeId: updatedBusiness.placeId,
      ...(updatedBusiness.address ? { city: updatedBusiness.address } : {}),
      ...(updatedBusiness.websiteUrl ? { websiteUrl: updatedBusiness.websiteUrl } : {}),
    });

    const cnpj: CnpjData | null = cnpjResult.success && cnpjResult.data ? cnpjResult.data : null;

    if (cnpj) {
      updatedBusiness = {
        ...updatedBusiness,
        cnpj: cnpj.cnpj,
        razaoSocial: cnpj.razaoSocial,
        nomeFantasia: cnpj.nomeFantasia,
        situacaoCadastral: cnpj.situacaoCadastral,
        dataInicioAtividade: cnpj.dataInicioAtividade ? new Date(cnpj.dataInicioAtividade) : undefined,
        cnaeDescricao: cnpj.cnaeDescricao,
        capitalSocial: cnpj.capitalSocial ? cnpj.capitalSocial.toString() : undefined,
      };
    }

    // Step 4: Check Meta Ads Library (3-Level Fallback)
    const metaAdsResult = await this.metaAdsTool.execute({
      businessName: updatedBusiness.name,
      ...(instagram.handle ? { handle: instagram.handle } : {}),
      ...(updatedBusiness.address ? { location: updatedBusiness.address } : {}),
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
            googleAds: {
              hasGoogleAds: false,
              adsUrl: `https://adstransparency.google.com/?region=BR&q=${encodeURIComponent(updatedBusiness.name)}`,
            },
            tiktokAds: {
              hasTikTokAds: false,
              adsUrl: `https://library.tiktok.com/ads?region=BR&q=${encodeURIComponent(updatedBusiness.name)}`,
            },
          };

    // Step 4.5: Real-time Ads Audit (Meta + Google + TikTok) with cold-outreach diagnosis
    const adsAuditResult = await this.adsAuditTool.execute({
      businessName: updatedBusiness.name,
      hasWebsite: updatedBusiness.hasWebsite,
      ...(updatedBusiness.websiteUrl ? { websiteUrl: updatedBusiness.websiteUrl } : {}),
      ...(instagram.handle ? { instagramHandle: instagram.handle } : {}),
      metaAds: {
        hasAds: metaAds.hasAds,
        count: metaAds.count,
        adsLibraryUrl: metaAds.adsLibraryUrl,
      },
      ...(metaAds.googleAds ? { googleAds: metaAds.googleAds } : {}),
      ...(metaAds.tiktokAds ? { tiktokAds: metaAds.tiktokAds } : {}),
    });

    const adsAudit: AdsAuditOutput | null =
      adsAuditResult.success && adsAuditResult.data ? adsAuditResult.data : null;

    // Step 5: Map Decision Makers & LinkedIn / TikTok Profiles
    const dmResult = await this.decisionMakerTool.execute({
      businessName: updatedBusiness.name,
      ...(updatedBusiness.address ? { location: updatedBusiness.address } : {}),
      ...(updatedBusiness.category ? { category: updatedBusiness.category } : {}),
    });

    const decisionMaker: DecisionMakerOutput =
      dmResult.success && dmResult.data
        ? dmResult.data
        : {
            likelyRole: 'Sócio-Proprietário / Decisor Principal',
            decisionMakerProfiles: [],
            personaType: 'OWNER_FOUNDER',
            buyerPainPoints: [],
          };

    // Step 5.1: Discover TikTok & LinkedIn URLs
    const tiktokUrl = await this.serperClient.searchTikTokHandle(updatedBusiness.name, updatedBusiness.address ?? undefined);
    const linkedinUrl = decisionMaker.decisionMakerProfiles?.[0]?.linkedinUrl ?? await this.serperClient.searchLinkedInCompanyUrl(updatedBusiness.name, updatedBusiness.address ?? undefined);

    // Step 5.2: Deep Apify Scraping for Instagram, TikTok, LinkedIn & Real Meta Ads
    const apifyIg = this.apifyClient.isConfigured && instagram.handle ? await this.apifyClient.scrapeInstagramProfile(instagram.handle) : null;
    const apifyTikTok = this.apifyClient.isConfigured && tiktokUrl ? await this.apifyClient.scrapeTikTokProfile(tiktokUrl) : null;
    const apifyLinkedIn = this.apifyClient.isConfigured && linkedinUrl ? await this.apifyClient.scrapeLinkedInCompany(linkedinUrl) : null;
    const apifyAds = this.apifyClient.isConfigured ? await this.apifyClient.scrapeMetaAdsLibrary(updatedBusiness.name) : null;

    // Step 6: Run Deep AI Structured Review with Unified Context (including Decision Maker Persona)
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
      ...(cnpj
        ? {
            cnpjData: {
              cnpj: cnpj.cnpj,
              razaoSocial: cnpj.razaoSocial,
              nomeFantasia: cnpj.nomeFantasia,
              situacaoCadastral: cnpj.situacaoCadastral,
              dataInicioAtividade: cnpj.dataInicioAtividade,
              cnaeDescricao: cnpj.cnaeDescricao,
              capitalSocial: cnpj.capitalSocial,
              qsa: cnpj.qsa,
            },
          }
        : {}),
      metaAdsData: {
        hasAds: metaAds.hasAds,
        count: metaAds.count,
        adsLibraryUrl: metaAds.adsLibraryUrl,
        ads: metaAds.ads.map(a => ({ id: a.id, pageName: a.pageName, snapshotUrl: a.snapshotUrl })),
      },
      ...(adsAudit
        ? {
            adsAuditData: {
              hasAnyAds: adsAudit.hasAnyAds,
              activeChannels: adsAudit.activeChannels,
              missedChannels: adsAudit.missedChannels,
              opportunityScore: adsAudit.opportunityScore,
              diagnosis: adsAudit.diagnosis,
              opportunities: adsAudit.opportunities,
              pitch: adsAudit.pitch,
              suggestedNextChannel: adsAudit.suggestedNextChannel,
            },
          }
        : {}),
      ...(scrapedCodeSnippet ? { scrapedCodeSnippet } : {}),
      targetIcp: this.targetIcp
        ? `${this.targetIcp} | Decisor: ${decisionMaker.likelyRole}`
        : `Decisor Alvo: ${decisionMaker.likelyRole}. Persona: ${decisionMaker.personaType}`,
      ...(this.icpContext ? { icpContext: this.icpContext } : {}),
      ...(this.valuePropContext ? { valuePropContext: this.valuePropContext } : {}),
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

    const durationMs = Date.now() - startedAt;
    this.logger.info(
      `Enriquecimento de lead concluído para "${business.name}"`,
      { score: aiReview.suitabilityScore, instagramHandle: instagram.handle, likelyRole: decisionMaker.likelyRole },
      durationMs,
    );

    return {
      business: updatedBusiness,
      instagram,
      metaAds,
      decisionMaker,
      cnpj,
      adsAudit,
      aiReview,
      tiktokUrl,
      linkedinUrl,
      apifyData: {
        apifyIg,
        apifyTikTok,
        apifyLinkedIn,
        apifyAds,
      },
      scrapes: {
        websiteScreenshotUrl,
        instagramScreenshotUrl,
        scrapedCodeUrl,
      },
      reviewedAt: new Date(),
    };
  }
}
